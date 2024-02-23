#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::doc_markdown)]

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use serve::serve;
use std::path::PathBuf;

mod build;
mod serve;

/// CLI arguments.
#[derive(Parser)]
#[command(
    version,
    about = "Contribcard CLI tool

https://github.com/cncf/contribcard"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

/// Commands available.
#[derive(Subcommand)]
enum Command {
    /// Build contributors cards website.
    Build(BuildArgs),

    /// Serve contributors cards website.
    Serve(ServeArgs),
}

/// Build command arguments.
#[derive(Args)]
struct BuildArgs {
    /// Cache directory.
    #[arg(long)]
    cache_dir: Option<PathBuf>,

    /// Name of the contributors cards website (i.e. kubernetes).
    #[arg(long)]
    name: String,

    /// Output directory to write files to.
    #[arg(long)]
    output_dir: PathBuf,

    /// Contribcard settings file.
    #[arg(long)]
    settings_file: PathBuf,
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

    /// Location of the contributors cards website files.
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
        Command::Serve(args) => serve(args).await?,
    }

    Ok(())
}
