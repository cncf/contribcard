//! This module defines the functionality of the build CLI subcommand.

use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    time::Instant,
};

use anyhow::{Context, Result, bail};
use askama::Template;
use reqwest::{StatusCode, Url};
use rust_embed::RustEmbed;
use tracing::{debug, info, instrument};

use crate::{
    BuildArgs,
    build::settings::{Settings, Theme},
};

mod db;
mod github;
mod settings;

/// Path where the data files will be written to in the output directory.
const DATA_PATH: &str = "data";

/// Path where some images will be written to in the output directory.
const IMAGES_PATH: &str = "images";

/// Embed web application assets into binary.
/// (these assets will be built automatically from the build script)
#[derive(RustEmbed)]
#[folder = "web/dist"]
struct WebAssets;

/// Build contribcard website.
#[instrument(skip_all)]
pub(crate) async fn build(args: &BuildArgs) -> Result<()> {
    info!("building contribcard website..");
    let start = Instant::now();

    // Initial setup
    let settings = Settings::new(&args.settings_file)?;
    let cache_dir = setup_cache_dir(args.cache_dir.as_ref())?;
    let base_cache_db = BaseCacheDB::new(args);
    let cache_db_file = setup_cache_db(&cache_dir, &args.name, base_cache_db.as_ref()).await?;
    setup_output_dir(&args.output_dir)?;

    // Collect contributions from GitHub
    if args.collect_contributions.unwrap_or(true) {
        let collector = github::Collector::new(&cache_db_file)?;
        collector.collect_contributions(&settings).await?;
    }
    let contribs_db = prepare_contributions_table(&cache_db_file)?;

    // Generate contributors data files
    generate_contributors_data_files(&args.output_dir, &contribs_db)?;

    // Generate all contributors data file
    generate_all_contributors_data_file(&args.output_dir, &contribs_db)?;

    // Render index file and write it to the output directory
    render_index(&settings.theme, &args.output_dir)?;

    // Download and copy theme images to the output directory
    copy_theme_images(&settings.theme, &args.output_dir).await?;

    // Copy web assets files to the output directory
    copy_web_assets(&args.output_dir)?;

    let duration = start.elapsed().as_secs_f64();
    info!("contribcard website built! (took: {:.3}s)", duration);
    Ok(())
}

/// Copy theme images to the output directory.
#[instrument(skip(theme), err)]
async fn copy_theme_images(theme: &Theme, output_dir: &Path) -> Result<()> {
    // Helper function to download an image to the output directory
    async fn download_image(url: &str, output_dir: &Path) -> Result<()> {
        // Fetch image
        let resp = reqwest::get(url).await.context(format!("error downloading image ({url})"))?;
        if resp.status() != StatusCode::OK {
            bail!(
                "unexpected status ({}) code downloading image ({url})",
                resp.status()
            );
        }
        let img = resp.bytes().await?;

        // Write image to output dir
        let url = Url::parse(url).context("invalid image url")?;
        let Some(file_name) = url.path_segments().and_then(Iterator::last) else {
            bail!("invalid image url: {url}");
        };
        let img_path = Path::new(IMAGES_PATH).join(file_name);
        File::create(output_dir.join(&img_path))?.write_all(&img)?;

        Ok(())
    }

    debug!("copying theme images to output directory");

    download_image(&theme.favicon_url, output_dir).await.context("favicon")?;
    download_image(&theme.logo_url, output_dir).await.context("logo")?;
    download_image(&theme.og_image_url, output_dir).await.context("og_image")?;

    Ok(())
}

/// Copy web assets files to the output directory.
#[instrument(err)]
fn copy_web_assets(output_dir: &Path) -> Result<()> {
    debug!("copying web assets to output directory");

    for asset_path in WebAssets::iter() {
        // The index document is a template that we'll render, so we don't want
        // to copy it as is.
        if asset_path == "index.html" || asset_path == ".keep" {
            continue;
        }

        if let Some(embedded_file) = WebAssets::get(&asset_path) {
            if let Some(parent_path) = Path::new(asset_path.as_ref()).parent() {
                fs::create_dir_all(output_dir.join(parent_path))?;
            }
            let mut file = File::create(output_dir.join(asset_path.as_ref()))?;
            file.write_all(&embedded_file.data)?;
        }
    }

    Ok(())
}

/// Generate contributors data files.
#[instrument(skip_all, err)]
fn generate_contributors_data_files(output_dir: &Path, contribs_db: &duckdb::Connection) -> Result<()> {
    debug!("generating contributors data files");

    // Get all contributors summaries from database
    let mut stmt = contribs_db.prepare(db::GET_ALL_CONTRIBUTORS_SUMMARIES)?;
    let rows = stmt.query_map([], |row| {
        let user: String = row.get(0)?;
        let summary: String = row.get(1)?;
        Ok((user, summary))
    })?;

    // Write each of them to a file
    let data_path = output_dir.join(DATA_PATH);
    for row in rows {
        let Ok((user, summary)) = row else { continue };
        let mut file = File::create(data_path.join(format!("{user}.json")))?;
        file.write_all(summary.as_bytes())?;
    }

    Ok(())
}

/// Generate all contributors data file.
#[instrument(skip_all, err)]
fn generate_all_contributors_data_file(output_dir: &Path, contribs_db: &duckdb::Connection) -> Result<()> {
    debug!("generating all contributors data file");

    // Get contributors from cache database
    let contributors: String = contribs_db.query_row(db::GET_CONTRIBUTORS, [], |row| row.get(0))?;

    // Write contributors data file to the output directory
    let data_path = output_dir.join(DATA_PATH);
    let mut file = File::create(data_path.join("_all_contributors.json"))?;
    file.write_all(contributors.as_bytes())?;

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

    Ok(contribs_db)
}

/// Template for the index document.
#[derive(Debug, Clone, Template)]
#[template(path = "index.html", escape = "none")]
struct Index<'a> {
    theme: &'a Theme,
}

/// Render index file and write it to the output directory.
#[instrument(skip_all, err)]
fn render_index(theme: &Theme, output_dir: &Path) -> Result<()> {
    debug!("rendering index.html file");

    // Prepare index, render it and write it to output dir
    let index = Index { theme }.render()?;
    File::create(output_dir.join("index.html"))?.write_all(index.as_bytes())?;

    Ok(())
}

/// Setup cache database.
#[instrument(skip(base_db), err)]
pub(crate) async fn setup_cache_db(
    cache_dir: &Path,
    name: &str,
    base_db: Option<&BaseCacheDB>,
) -> Result<String> {
    debug!("setting up cache database");

    // If there isn't a cache database yet, use the base one (if provided)
    let path = cache_dir.join(format!("{name}.db"));
    if !path.exists() && base_db.is_some() {
        // Download base cache database
        let base_db = base_db.as_ref().expect("base db to be present");
        debug!("fetching base cache database");
        let mut request = reqwest::Client::new().get(&base_db.url);
        if base_db.username.is_some() {
            request = request.basic_auth(
                base_db.username.as_ref().expect("username to be present"),
                base_db.password.as_ref(),
            );
        }
        let response = request.send().await.context("error fetching base cache db")?;
        if response.status() != reqwest::StatusCode::OK {
            bail!("error fetching base cache db: {}", response.status());
        }

        // Store it in the cache directory
        let base_db_data = response.bytes().await?;
        fs::write(&path, &base_db_data).context("error writing base cache db")?;
    }

    // Create tables if they don't already exist (i.e. new database)
    let db = duckdb::Connection::open(&path)?;
    db.execute(db::CREATE_COMMIT_TABLE, [])?;
    db.execute(db::CREATE_ISSUE_TABLE, [])?;
    db.execute(db::CREATE_PULL_REQUEST_TABLE, [])?;

    Ok(path.display().to_string())
}

/// Setup cache directory. If none is provided, we'll setup one based on the
/// user's cache directory.
#[instrument(err)]
fn setup_cache_dir(cache_dir: Option<&PathBuf>) -> Result<PathBuf> {
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

    for path in &[DATA_PATH, IMAGES_PATH] {
        let path = output_dir.join(path);
        if !path.exists() {
            fs::create_dir(path)?;
        }
    }

    Ok(())
}

/// Base cache database configuration.
#[derive(Debug, Clone, Default, PartialEq)]
struct BaseCacheDB {
    url: String,
    username: Option<String>,
    password: Option<String>,
}

impl BaseCacheDB {
    /// Create a new BaseCacheDB instance from the build arguments provided.
    fn new(args: &BuildArgs) -> Option<Self> {
        let url = args.base_cache_db_url.as_ref()?;

        Some(Self {
            url: url.clone(),
            username: args.base_cache_db_username.clone(),
            password: args.base_cache_db_password.clone(),
        })
    }
}

mod filters {
    use anyhow::anyhow;
    use reqwest::Url;

    /// Filter to get file name of the url provided.
    pub(crate) fn file_name(url: &str, _: &dyn askama::Values) -> askama::Result<String> {
        let url = Url::parse(url).map_err(|err| askama::Error::Custom(err.into()))?;
        let file_name = url
            .path_segments()
            .ok_or(askama::Error::Custom(anyhow!("invalid url").into()))?
            .next_back()
            .ok_or(askama::Error::Custom(anyhow!("invalid url").into()))?;
        Ok(file_name.to_string())
    }
}
