//! This module defines the functionality of the deploy CLI subcommand for the
//! AWS S3 provider.

use std::{
    collections::HashMap,
    env,
    fmt::Write,
    fs,
    path::{Path, PathBuf},
    time::Instant,
};

use anyhow::{bail, format_err, Context, Result};
use aws_sdk_s3::primitives::ByteStream;
use futures::stream::{self, StreamExt};
use md5::{Digest, Md5};
use mime_guess::mime;
use tracing::{debug, info, instrument};
use walkdir::WalkDir;

use crate::S3Args;

/// File name of the index document.
const INDEX_DOCUMENT: &str = "index.html";

/// Number of files to upload concurrently.
const UPLOAD_FILES_CONCURRENCY: usize = 50;

/// Type alias to represent an object's checksum.
type Checksum = String;

/// Type alias to represent an object's key.
type Key = String;

/// Deploy contribcard website to AWS S3.
#[instrument(skip_all, err)]
pub(crate) async fn deploy(args: &S3Args) -> Result<()> {
    info!("deploying contribcard website..");
    let start = Instant::now();

    // Check required environment variables
    check_env_vars()?;

    // Setup AWS S3 client
    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    // Get deployed objects
    let deployed_objects = get_deployed_objects(&s3_client, &args.bucket).await?;

    // Upload website files (except index document)
    upload_objects(&s3_client, &args.bucket, &args.content_dir, &deployed_objects).await?;

    // Upload index document if all the other files were uploaded successfully
    let index_remote_checksum = deployed_objects.get(INDEX_DOCUMENT).and_then(|checksum| checksum.as_ref());
    upload_index_document(&s3_client, &args.bucket, &args.content_dir, index_remote_checksum).await?;

    let duration = start.elapsed().as_secs_f64();
    info!("contribcard website deployed! (took: {:.3}s)", duration);

    Ok(())
}

/// Check that the required environment variables have been provided.
#[instrument(skip_all, err)]
fn check_env_vars() -> Result<()> {
    let required_env_vars = ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];

    for var in required_env_vars {
        let result = env::var(var);
        if result.is_err() || result.expect("var to be set").is_empty() {
            bail!("required environment variable {var} not provided");
        }
    }

    Ok(())
}

/// Get deployed objects returning their key and checksum.
#[instrument(skip_all, err)]
async fn get_deployed_objects(
    s3_client: &aws_sdk_s3::Client,
    bucket: &str,
) -> Result<HashMap<Key, Option<Checksum>>> {
    let mut deployed_objects = HashMap::new();

    let mut continuation_token = None;
    loop {
        let mut request = s3_client.list_objects_v2().bucket(bucket);
        if let Some(token) = continuation_token {
            request = request.continuation_token(token);
        }
        let output = request.send().await?;
        if let Some(objects) = output.contents {
            for object in objects {
                let Some(key) = object.key else { continue };
                let checksum = object.e_tag.map(|etag| etag.trim_matches('"').to_string());
                deployed_objects.insert(key, checksum);
            }
        }
        if !output.is_truncated.unwrap_or(false) {
            break;
        }
        continuation_token = output.next_continuation_token;
    }

    Ok(deployed_objects)
}

/// Upload contribcard website files to S3 bucket.
#[instrument(skip_all, err)]
async fn upload_objects(
    s3_client: &aws_sdk_s3::Client,
    bucket: &str,
    content_dir: &PathBuf,
    deployed_objects: &HashMap<Key, Option<Checksum>>,
) -> Result<()> {
    // Upload files in the content directory to the bucket provided
    let results: Vec<Result<()>> = stream::iter(WalkDir::new(content_dir))
        .map(|entry| async {
            // Check if the entry is a regular file
            let entry = entry?;
            if !entry.file_type().is_file() {
                return Ok(());
            }

            // Prepare object's key
            let file = entry.path();
            let key = file
                .display()
                .to_string()
                .trim_start_matches(content_dir.display().to_string().as_str())
                .trim_start_matches('/')
                .to_string();

            // We'll upload the index document at the end when all the other
            // files have been uploaded successfully
            if key == INDEX_DOCUMENT {
                return Ok(());
            }

            // Skip files that start with a dot
            if key.starts_with('.') {
                return Ok(());
            }

            // Skip objects that haven't changed
            let checksum = md5sum(file)?;
            if let Some(Some(remote_checksum)) = deployed_objects.get(&key) {
                if checksum == *remote_checksum {
                    return Ok(());
                }
            }

            // Prepare object's body and content type
            let body = ByteStream::from_path(file).await?;
            let content_type = mime_guess::from_path(&key)
                .first()
                .ok_or(format_err!("cannot detect content type of key: {})", &key))?;

            // Upload file
            s3_client
                .put_object()
                .bucket(bucket)
                .key(&key)
                .body(body)
                .content_type(content_type.essence_str())
                .send()
                .await
                .context(format_err!("error uploading file {}", key))?;

            debug!(?key, "file uploaded");
            Ok(())
        })
        .buffer_unordered(UPLOAD_FILES_CONCURRENCY)
        .collect()
        .await;

    // Process results
    let mut errors_found = false;
    let mut errors = String::new();
    for result in results {
        if let Err(err) = result {
            errors_found = true;
            writeln!(&mut errors, "- {err:?}")?;
        }
    }
    if errors_found {
        bail!("{errors}");
    }

    Ok(())
}

/// Upload contribcard website index document to S3 bucket.
#[instrument(skip_all, err)]
async fn upload_index_document(
    s3_client: &aws_sdk_s3::Client,
    bucket: &str,
    content_dir: &Path,
    remote_checksum: Option<&Checksum>,
) -> Result<()> {
    // Prepare object's checksum, key, body and content type
    let file = content_dir.join(INDEX_DOCUMENT);
    let checksum = md5sum(&file)?;
    let key = INDEX_DOCUMENT.to_string();
    let body = ByteStream::from_path(&file).await?;
    let content_type = mime::TEXT_HTML.essence_str();

    // Check if the remote copy is up to date
    if let Some(remote_checksum) = remote_checksum {
        if checksum == *remote_checksum {
            return Ok(());
        }
    }

    // Upload file
    s3_client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(body)
        .content_type(content_type)
        .send()
        .await
        .context("error uploading index document")?;

    debug!("index document uploaded");
    Ok(())
}

/// Calculate the MD5 digest of a file.
fn md5sum(path: &Path) -> Result<String> {
    let mut hasher = Md5::new();
    hasher.update(fs::read(path)?);
    let result = hasher.finalize();

    Ok(format!("{result:x}"))
}
