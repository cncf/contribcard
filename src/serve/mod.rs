//! This module defines the functionality of the serve CLI subcommand.

use std::{env, net::SocketAddr};

use anyhow::Result;
use axum::{routing::get_service, Router};
use tokio::{net::TcpListener, signal};
use tower_http::services::{ServeDir, ServeFile};
use tracing::{info, instrument};

use crate::ServeArgs;

/// Serve contribcard website.
#[instrument(skip_all)]
pub(crate) async fn serve(args: &ServeArgs) -> Result<()> {
    // Setup router
    let content = if let Some(dir) = args.content_dir.clone() {
        dir
    } else {
        let dir = env::current_dir()?;
        info!(
            "using current directory as content directory: {:?}",
            dir.display()
        );
        dir
    };
    let index_path = content.join("index.html");
    let router: Router<()> = Router::new().fallback(get_service(
        ServeDir::new(&content).not_found_service(ServeFile::new(&index_path)),
    ));

    // Setup and launch HTTP server
    let addr: SocketAddr = args.addr.parse()?;
    let listener = TcpListener::bind(addr).await?;
    info!("http server running (press ctrl+c to stop)");
    println!("\n🔗 contribcard available at: http://{addr}\n");
    if args.graceful_shutdown {
        axum::serve(listener, router).with_graceful_shutdown(shutdown_signal()).await?;
    } else {
        axum::serve(listener, router).await?;
    }

    Ok(())
}

/// Return a future that will complete when the program is asked to stop via a
/// ctrl+c or terminate signal.
async fn shutdown_signal() {
    // Setup signal handlers
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to install ctrl+c signal handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install terminate signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    // Wait for any of the signals
    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
