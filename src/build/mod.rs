//! This module defines the functionality of the build CLI subcommand.

use crate::{build::settings::Settings, BuildArgs};
use anyhow::Result;
use askama::Template;
use rust_embed::RustEmbed;
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    time::Instant,
};
use tracing::{debug, info, instrument};

mod db;
mod github;
mod settings;

/// Path where the data files will be written to in the output directory.
const DATA_PATH: &str = "data";

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
    let cache_dir = setup_cache_dir(&args.cache_dir)?;
    let cache_db_file = setup_cache_db(&cache_dir, &args.name)?;
    setup_output_dir(&args.output_dir)?;

    // Collect contributions from GitHub
    let collector = github::Collector::new(&cache_db_file)?;
    collector.collect_contributions(&settings.organizations).await?;
    let contribs_db = prepare_contributions_table(&cache_db_file)?;

    // Generate contributors data files
    generate_contributors_data_files(&args.output_dir, &contribs_db)?;

    // Render index file and write it to the output directory
    render_index(&args.output_dir, &contribs_db)?;

    // Copy web assets files to the output directory
    copy_web_assets(&args.output_dir)?;

    let duration = start.elapsed().as_secs_f64();
    info!("contribcard website built! (took: {:.3}s)", duration);
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
struct Index {
    contributors: String,
}

/// Render index file and write it to the output directory.
#[instrument(skip_all, err)]
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

    let data_path = output_dir.join(DATA_PATH);
    if !data_path.exists() {
        fs::create_dir(data_path)?;
    }

    Ok(())
}
