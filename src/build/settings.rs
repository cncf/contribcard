//! This module defines the types used to represent the contribcard settings.

use std::{fs::File, path::Path};

use anyhow::Result;
use serde::{Deserialize, Serialize};

/// ContribCard settings.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Settings {
    #[serde(default)]
    pub organizations: Vec<String>,
    #[serde(default)]
    pub repositories: Vec<String>,
}

impl Settings {
    /// Create a new settings instance from the file provided.
    pub(crate) fn new(path: &Path) -> Result<Self> {
        let file = File::open(path)?;
        let settings: Self = serde_yaml::from_reader(file)?;

        Ok(settings)
    }
}
