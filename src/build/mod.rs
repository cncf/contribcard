//! This module defines the functionality of the build CLI subcommand.

use crate::{build::settings::Settings, BuildArgs};
use anyhow::{format_err, Result};
use askama::Template;
use futures::stream::{self, StreamExt};
use std::{
    env,
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    time::Instant,
};
use tracing::{debug, info, instrument};

mod db;
mod github;
mod settings;

/// Build contributors cards website.
#[instrument(skip_all)]
pub(crate) async fn build(args: &BuildArgs) -> Result<()> {
    info!("building contributors cards website..");
    let start = Instant::now();

    // Initial setup
    let settings = Settings::new(&args.settings_file)?;
    let cache_dir = setup_cache_dir(&args.cache_dir)?;
    let cache_db_file = setup_cache_db(&cache_dir, &args.name)?;
    setup_output_dir(&args.output_dir)?;

    // Collect contributions from GitHub
    collect_contributions(&settings.repositories, &cache_db_file).await?;
    let contribs_db = prepare_contributions_table(&cache_db_file)?;

    // Render index file and write it to the output directory
    render_index(&args.output_dir, &contribs_db)?;

    let duration = start.elapsed().as_secs_f64();
    info!("contributors cards website built! (took: {:.3}s)", duration);
    Ok(())
}

/// Collect contributions from GitHub from each repository.
#[instrument(skip_all, err)]
async fn collect_contributions(repositories: &Vec<String>, cache_db_file: &String) -> Result<()> {
    debug!("collecting contributions");

    // Setup GitHub tokens and collector
    let Ok(gh_tokens) = env::var("GITHUB_TOKENS") else {
        return Err(format_err!("required GITHUB_TOKENS not provided"));
    };
    let gh_tokens: Vec<String> = gh_tokens.split(',').map(ToString::to_string).collect();
    let gh_collector = github::Collector::new(&gh_tokens, cache_db_file);

    // Collect contributions from each repository
    let errors_found: bool = stream::iter(repositories)
        .map(|repo| async {
            let (owner, repo) = github::parse_repository(&repo.clone())?;
            gh_collector.collect_contributions(&owner, &repo).await
        })
        .buffer_unordered(gh_tokens.len())
        .collect::<Vec<Result<()>>>()
        .await
        .iter()
        .any(Result::is_err);
    if errors_found {
        return Err(format_err!("something went wrong, see errors above"));
    }

    debug!("done!");
    Ok(())
}

/// Prepare contributions table from all the commits, issues and pull requests
/// collected from GitHub available in the cache database.
#[instrument(err)]
fn prepare_contributions_table(cache_db_file: &str) -> Result<duckdb::Connection> {
    debug!("preparing contributions table");

    let contribs_db = duckdb::Connection::open_in_memory()?;
    contribs_db.execute(&format!("attach '{}' as cache;", &cache_db_file), [])?;
    contribs_db.execute(db::CREATE_CONTRIBUTION_TABLE, [])?;
    contribs_db.execute_batch(db::LOAD_CONTRIBUTIONS_FROM_CACHE)?;

    debug!("done!");
    Ok(contribs_db)
}

/// Template for the index document.
#[derive(Debug, Clone, Template)]
#[template(path = "index.html", escape = "none")]
struct Index {
    contributors: String,
}

/// Render index file and write it to the output directory.
#[instrument(skip(contribs_db), err)]
fn render_index(output_dir: &Path, contribs_db: &duckdb::Connection) -> Result<()> {
    debug!("rendering index.html file");

    // Get contributors from cache database
    let contributors: String = contribs_db.query_row(db::GET_CONTRIBUTORS, [], |row| row.get(0))?;

    // Prepare index, render it and write it to output dir
    let index = Index { contributors }.render()?;
    File::create(output_dir.join("index.html"))?.write_all(index.as_bytes())?;

    Ok(())
}

/// Setup cache database.
#[instrument(err)]
pub(crate) fn setup_cache_db(cache_dir: &Path, name: &str) -> Result<String> {
    debug!("setting up cache database");

    let path = cache_dir.join(format!("{name}.db"));
    let db = duckdb::Connection::open(&path)?;

    db.execute(db::CREATE_COMMIT_TABLE, [])?;
    db.execute(db::CREATE_ISSUE_TABLE, [])?;
    db.execute(db::CREATE_PULL_REQUEST_TABLE, [])?;

    Ok(path.display().to_string())
}

/// Setup cache directory. If none is provided, we'll setup one based on the
/// user's cache directory.
#[instrument(err)]
fn setup_cache_dir(cache_dir: &Option<PathBuf>) -> Result<PathBuf> {
    debug!("setting up cache directory");

    let cache_dir = match cache_dir {
        Some(cache_dir) => Some(cache_dir.clone()),
        None => dirs::cache_dir(),
    }
    .expect("cache directory to be set up")
    .join("contribcard");
    debug!(?cache_dir);

    if !cache_dir.exists() {
        debug!(?cache_dir, "creating cache directory");
        fs::create_dir_all(&cache_dir)?;
    }

    Ok(cache_dir)
}

/// Setup output directory, creating it as well as any of the other required
/// paths inside it when needed.
#[instrument(err)]
fn setup_output_dir(output_dir: &Path) -> Result<()> {
    debug!("setting up output directory");

    if !output_dir.exists() {
        debug!("creating output directory");
        fs::create_dir_all(output_dir)?;
    }

    Ok(())
}
