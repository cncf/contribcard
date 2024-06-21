//! This module is in charge of collecting contributions from GitHub.

use crate::build::db;
use anyhow::{bail, ensure, Context, Result};
use chrono::DateTime;
use deadpool::unmanaged::{Object, Pool};
use duckdb::{AccessMode, Config, OptionalExt};
use futures::stream::{self, StreamExt};
use reqwest::{
    header::{self, HeaderMap},
    StatusCode,
};
use serde_json::Value;
use std::{
    env,
    io::{Seek, SeekFrom, Write},
    sync::{Arc, Mutex},
};
use tempfile::NamedTempFile;
use tracing::{debug, instrument, trace};
use crate::build::settings::Settings;

/// GitHub API base url.
const API_BASE_URL: &str = "https://api.github.com";

/// Minimum rate limit remaining value to consider a token valid.
const MIN_RATELIMIT_REMAINING: i64 = 100;

/// Collect and cache contributions (commits, issues, prs) from GitHub.
///
/// A collector instance can be used to collect contributions from multiple
/// repositories concurrently and store them in a cache database. The first
/// run may take some time, but subsequent runs will collect information in an
/// incremental way, so they'll much faster.
///
/// The level of concurrency will depend on the number of tokens provided.
pub(crate) struct Collector {
    cache_db_file: String,
    cache_lock: Arc<Mutex<()>>,
    http_clients: Pool<reqwest::Client>,
}

impl Collector {
    /// Create a new Collector instance.
    pub(crate) fn new(cache_db_file: &String) -> Result<Self> {
        // Setup GitHub tokens
        let Ok(tokens) = env::var("GITHUB_TOKENS") else {
            bail!("required GITHUB_TOKENS not provided");
        };
        let tokens: Vec<String> = tokens.split(',').map(ToString::to_string).collect();

        Ok(Self {
            cache_db_file: cache_db_file.to_string(),
            cache_lock: Arc::new(Mutex::new(())),
            http_clients: Pool::from(
                tokens.iter().map(|token| Self::new_http_client(token)).collect::<Vec<reqwest::Client>>(),
            ),
        })
    }

    /// Collect contributions (commits, issues, prs) from GitHub for each of
    /// the repositories in the GitHub organizations provided.
    #[instrument(skip(self))]
    pub(crate) async fn collect_contributions(&self, settings: &Settings) -> Result<()> {
        debug!("collecting contributions");

        // Fetch organizations' repositories
        let mut repositories = vec![];
        for org in &settings.organizations {
            repositories.extend(self.list_repositories(org).await?);
        }
        for repo in &settings.repositories {
            let pair = repo.splitn(2, '/').collect::<Vec<&str>>();
            ensure!(pair.len() == 2, "repository format must be owner/repo, found: {repo}");
            ensure!(!pair[0].contains('/'), "owner cannot contain a slash, found: {}", pair[0]);
            ensure!(!pair[1].contains('/'), "repo cannot contain a slash, found: {}", pair[1]);
            repositories.push((pair[0].to_string(), pair[1].to_string()));
        }

        // Collect contributions from each repository
        let errors_found: bool = stream::iter(repositories)
            .map(|(owner, repo)| async move {
                self.collect_commits(&owner, &repo).await.context("error collecting commits")?;
                self.collect_issues_and_prs(&owner, &repo)
                    .await
                    .context("error collecting issues and pull requests")
            })
            .buffer_unordered(self.http_clients.status().size)
            .collect::<Vec<Result<()>>>()
            .await
            .iter()
            .any(Result::is_err);
        if errors_found {
            bail!("something went wrong, see errors above");
        }

        debug!("done!");
        Ok(())
    }

    /// List repositories in the GitHub organization provided.
    #[instrument(skip(self))]
    pub(crate) async fn list_repositories(&self, org: &str) -> Result<Vec<(String, String)>> {
        let mut repositories = vec![];

        // Fetch repositories pages until there are no more available
        let mut url = format!("{API_BASE_URL}/orgs/{org}/repos?type=public&per_page=100");
        loop {
            // Fetch page
            let (headers, Some(mut body)) = self.fetch_page(&url).await? else {
                break;
            };

            // Parse response and extract repositories
            body.seek(SeekFrom::Start(0))?;
            let v: Value = serde_json::from_reader(&body)?;
            if let Some(repos) = v.as_array() {
                for repo in repos {
                    repositories.push((
                        org.to_string(),
                        repo["name"].as_str().expect("name to be a string").to_string(),
                    ));
                }
            }

            // Get next page url
            let Some(next_page_url) = Self::next_page(&headers)? else {
                break;
            };
            url = next_page_url;
        }

        Ok(repositories)
    }

    /// Collect and cache all commits available since the last one processed.
    #[instrument(skip(self), err)]
    async fn collect_commits(&self, owner: &str, repo: &str) -> Result<()> {
        trace!(owner, repo, "collecting commits");

        // Setup temporary database in memory
        let tmp_db = duckdb::Connection::open_in_memory()?;
        tmp_db.execute(db::CREATE_COMMIT_TABLE, [])?;

        // Build first page url
        let mut url = format!("{API_BASE_URL}/repos/{owner}/{repo}/commits?per_page=100");
        if let Some(ts) = self.last_timestamp(db::GET_LAST_COMMIT_TS, &[&owner, &repo])? {
            url.push_str(&format!("&since={ts}"));
        }

        // Fetch commits pages until there are no more available
        loop {
            // Fetch page
            let (headers, Some(body)) = self.fetch_page(&url).await? else {
                break;
            };

            // Load page commits into temporary database
            tmp_db.execute(
                db::LOAD_COMMITS_FROM_JSON_FILE,
                [
                    owner,
                    repo,
                    body.path().to_str().expect("path to be valid unicode"),
                ],
            )?;

            // Get next page url
            let Some(next_page_url) = Self::next_page(&headers)? else {
                break;
            };
            url = next_page_url;
        }

        // Copy commits collected from temporary database to cache database
        let _cache_guard = self.cache_lock.lock().unwrap();
        tmp_db.execute(&format!("attach '{}' as cache;", &self.cache_db_file), [])?;
        tmp_db.execute(db::COPY_COMMITS_TO_CACHE, [])?;

        trace!(owner, repo, "done!");
        Ok(())
    }

    /// Collect and cache all issues and pull requests available since the last
    /// one processed.
    #[instrument(skip(self), err)]
    async fn collect_issues_and_prs(&self, owner: &str, repo: &str) -> Result<()> {
        trace!(owner, repo, "collecting issues and prs");

        // Setup temporary database in memory
        let tmp_db = duckdb::Connection::open_in_memory()?;
        tmp_db.execute(db::CREATE_ISSUE_TABLE, [])?;
        tmp_db.execute(db::CREATE_PULL_REQUEST_TABLE, [])?;

        // Build first page url
        let mut url = format!("{API_BASE_URL}/repos/{owner}/{repo}/issues?state=all&per_page=100");
        if let Some(ts) = self.last_timestamp(db::GET_LAST_ISSUE_OR_PULL_REQUEST_TS, &[&owner, &repo])? {
            url.push_str(&format!("&since={ts}"));
        }

        // Fetch issues pages until there are no more available
        loop {
            // Fetch page
            let (headers, Some(body)) = self.fetch_page(&url).await? else {
                break;
            };

            // Load page issues into temporary database
            tmp_db.execute(
                db::LOAD_ISSUES_FROM_JSON_FILE,
                [
                    owner,
                    repo,
                    body.path().to_str().expect("path to be valid unicode"),
                ],
            )?;

            // Load page pull requests into temporary database
            tmp_db.execute(
                db::LOAD_PULL_REQUESTS_FROM_JSON_FILE,
                [
                    owner,
                    repo,
                    body.path().to_str().expect("path to be valid unicode"),
                ],
            )?;

            // Get next page url
            let Some(next_page_url) = Self::next_page(&headers)? else {
                break;
            };
            url = next_page_url;
        }

        // Copy issues and pull requests collected from temporary database to
        // the cache database
        let _cache_guard = self.cache_lock.lock().unwrap();
        tmp_db.execute(&format!("attach '{}' as cache;", &self.cache_db_file), [])?;
        tmp_db.execute(db::COPY_ISSUES_TO_CACHE, [])?;
        tmp_db.execute(db::COPY_PULL_REQUESTS_TO_CACHE, [])?;

        trace!(owner, repo, "done!");
        Ok(())
    }

    /// Fetch the page requested and return the response headers and a file
    /// with the body content (unless it's empty).
    #[instrument(skip(self), err)]
    async fn fetch_page(&self, url: &str) -> Result<(HeaderMap, Option<NamedTempFile>)> {
        // Get an http client from the pool and do the request
        let client = self.http_clients.get().await?;
        let response = client.get(url).send().await?;
        if response.status() != StatusCode::OK {
            bail!("unexpected status code ({:?})", response.status());
        }

        // Extract headers and copy body to a temporary file
        let headers = response.headers().clone();
        let body = response.text().await?;
        let body = if body == "[]" {
            None
        } else {
            let mut tmp_file = NamedTempFile::new()?;
            tmp_file.write_all(body.as_bytes())?;
            Some(tmp_file)
        };

        // Remove client from the pool if the token is about to reach the rate limit
        let rl_remaining = headers.get("x-ratelimit-remaining");
        if rl_remaining
            .expect("x-ratelimit-remaining header to be present")
            .to_str()
            .expect("x-ratelimit-remaining header value to use valid chars")
            .parse::<i64>()
            .expect("x-ratelimit-remaining header value to be an integer")
            <= MIN_RATELIMIT_REMAINING
        {
            let _ = Object::take(client);
        }

        Ok((headers, body))
    }

    /// Get the timestamp of the most recent record for a given entity using
    /// the provided sql query.
    #[instrument(skip(self, params), err)]
    fn last_timestamp(&self, sql: &str, params: &[&dyn duckdb::ToSql]) -> Result<Option<String>> {
        // Open read-only connection to cache database
        let db = duckdb::Connection::open_with_flags(
            &self.cache_db_file,
            Config::default().access_mode(AccessMode::ReadOnly)?,
        )?;

        // Get timestamp of the last entry using the sql provided
        let ts: Option<String> = db.query_row(sql, params, |row| row.get(0)).optional()?.map(|ts: i64| {
            DateTime::from_timestamp_millis(ts / 1000)
                .expect("last timestamp to be valid")
                .to_rfc3339()
        });

        Ok(ts)
    }

    /// Return the next page url from the information in the link header.
    #[instrument(err)]
    fn next_page(headers: &HeaderMap) -> Result<Option<String>> {
        // Get link header
        let Some(link_header) = headers.get("link") else {
            return Ok(None);
        };

        // Parse link header and extract next page url
        let rels = parse_link_header::parse_with_rel(link_header.to_str()?)?;
        if let Some(next_page_url) = rels.get("next") {
            return Ok(Some(next_page_url.raw_uri.clone()));
        }

        Ok(None)
    }

    /// Create a new http client using the token provided.
    #[instrument(skip(token))]
    fn new_http_client(token: &str) -> reqwest::Client {
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::ACCEPT,
            header::HeaderValue::from_str("application/vnd.github+json").unwrap(),
        );
        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );
        headers.insert(
            "X-GitHub-Api-Version",
            header::HeaderValue::from_str("2022-11-28").unwrap(),
        );

        reqwest::Client::builder()
            .user_agent(format!(
                "{}/{}",
                env!("CARGO_PKG_NAME"),
                env!("CARGO_PKG_VERSION")
            ))
            .default_headers(headers)
            .build()
            .expect("client to be valid")
    }
}
