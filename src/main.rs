#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::doc_markdown)]

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use deploy::s3;
use serve::serve;
use std::path::PathBuf;

mod build;
mod deploy;
mod serve;

/// CLI arguments.
#[derive(Parser)]
#[command(
    version,
    about = "ContribCard CLI tool

https://github.com/cncf/contribcard"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

/// Commands available.
#[derive(Subcommand)]
enum Command {
    /// Build contribcard website.
    Build(BuildArgs),

    /// Deploy contribcard website (experimental).
    Deploy(DeployArgs),

    /// Serve contribcard website.
    Serve(ServeArgs),
}

/// Build command arguments.
#[derive(Args)]
struct BuildArgs {
    /// Base cache database URL.
    #[arg(long)]
    base_cache_db_url: Option<String>,

    /// Username used to fetch the base cache database (basic auth).
    #[arg(long)]
    base_cache_db_username: Option<String>,

    /// Password used to fetch the base cache database (basic auth).
    #[arg(long)]
    base_cache_db_password: Option<String>,

    /// Cache directory.
    #[arg(long)]
    cache_dir: Option<PathBuf>,

    /// Whether contributions should be collected or not.
    #[arg(long)]
    collect_contributions: Option<bool>,

    /// Name of the contribcard website (i.e. kubernetes).
    #[arg(long)]
    name: String,

    /// Output directory to write files to.
    #[arg(long)]
    output_dir: PathBuf,

    /// ContribCard settings file.
    #[arg(long)]
    settings_file: PathBuf,
}

/// Deploy command arguments.
#[derive(Args)]
#[command(args_conflicts_with_subcommands = true)]
struct DeployArgs {
    /// Provider used to deploy the contribcard website.
    #[command(subcommand)]
    provider: Provider,
}

/// Provider used to deploy the contribcard website.
#[derive(Subcommand)]
enum Provider {
    /// Deploy contribcard website to AWS S3.
    S3(S3Args),
}

/// AWS S3 provider arguments.
#[derive(Args)]
struct S3Args {
    /// Bucket to copy the contribcard website files to.
    #[arg(long)]
    bucket: String,

    /// Location of the contribcard website files (build subcommand output).
    #[arg(long)]
    content_dir: PathBuf,
}

/// Serve command arguments.
#[derive(Args)]
struct ServeArgs {
    /// Address the web server will listen on.
    #[arg(long, default_value = "127.0.0.1:8000")]
    addr: String,

    /// Whether the server should stop gracefully or not.
    #[arg(long, default_value_t = false)]
    graceful_shutdown: bool,

    /// Location of the contribcard website files.
    /// The current path will be used when none is provided.
    #[arg(long)]
    content_dir: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Setup logging
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "contribcard=debug");
    }
    tracing_subscriber::fmt::init();

    // Run command
    match &cli.command {
        Command::Build(args) => build(args).await?,
        Command::Deploy(args) => {
            match &args.provider {
                Provider::S3(args) => s3::deploy(args).await?,
            };
        }
        Command::Serve(args) => serve(args).await?,
    }

    Ok(())
}
