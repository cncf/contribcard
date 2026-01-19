# AGENTS.md

## Project Overview

**ContribCard** is a tool designed to generate contributor cards for open source projects. It collects contribution data from GitHub repositories (commits, issues, pull requests) and presents them through an interactive web interface. The project was initially created to celebrate the Kubernetes 10th anniversary but is designed to be configurable for use by other projects.

**Repository:** https://github.com/cncf/contribcard  
**License:** Apache License 2.0  
**Status:** Early development (breaking changes may occur)  
**Live Demo:** https://contribcard.clotributor.dev

## Architecture

### High-Level Architecture

ContribCard is a hybrid application consisting of:

1. **Rust CLI Tool** - Backend data collection and site generation
2. **SolidJS Web Application** - Frontend UI for displaying contributor cards
3. **DuckDB Database** - Local caching of GitHub contribution data
4. **Optional Deployment** - AWS S3 deployment capability

### Technology Stack

**Backend (Rust):**
- Language: Rust (edition 2024, min version 1.90.0)
- Database: DuckDB (with JSON support)
- HTTP Client: reqwest (async)
- Web Server: Axum + Tower
- Template Engine: Askama
- Async Runtime: Tokio

**Frontend (JavaScript/TypeScript):**
- Framework: SolidJS 1.9.9
- Router: @solidjs/router 0.15.3
- Build Tool: Vite 7.1.7
- Language: TypeScript 5.9.2
- Package Manager: Yarn

**Infrastructure:**
- Container: Alpine Linux 3.22 base
- Deployment: AWS S3 (optional)
- CI/CD: GitHub Actions

## Project Structure

```
contribcard/
├── src/                    # Rust source code
│   ├── build/             # Build command implementation
│   │   ├── db.rs          # Database SQL definitions
│   │   ├── github.rs      # GitHub API collection logic
│   │   ├── mod.rs         # Build orchestration
│   │   └── settings.rs    # Configuration types
│   ├── deploy/            # Deployment implementations
│   │   ├── mod.rs
│   │   └── s3.rs          # AWS S3 deployment
│   ├── serve/             # Web server
│   │   └── mod.rs         # HTTP server implementation
│   └── main.rs            # CLI entry point
├── web/                   # Frontend SolidJS application
│   ├── src/
│   │   ├── api/           # API data fetching
│   │   ├── assets/        # Static assets
│   │   ├── layout/        # UI components
│   │   │   ├── common/    # Shared components
│   │   │   ├── contributor/  # Contributor cards
│   │   │   └── search/    # Search interface
│   │   ├── App.tsx        # Main app component
│   │   └── index.tsx      # Entry point
│   ├── public/            # Public assets
│   ├── index.html         # HTML template
│   └── package.json       # Node dependencies
├── settings/              # Example configuration files
│   └── site-name.yml      # Settings template
├── docs/                  # Documentation
│   └── screenshots/       # UI screenshots
├── .github/
│   └── workflows/
│       ├── ci.yml         # Continuous integration
│       └── build-image.yml # Container builds
├── build.rs               # Cargo build script
├── Cargo.toml             # Rust dependencies
├── Dockerfile             # Multi-stage container build
└── askama.toml           # Template engine config
```

## Core Components

### 1. CLI Tool (`src/main.rs`)

The main entry point provides three subcommands:

#### `build` - Build ContribCard Website
Collects GitHub contributions and generates static website files.

**Key Arguments:**
- `--name`: Website name (required)
- `--settings-file`: YAML configuration file (required)
- `--output-dir`: Where to write generated files (required)
- `--cache-dir`: Cache directory for database (optional)
- `--collect-contributions`: Whether to fetch new data (optional)
- `--base-cache-db-url`: URL to pre-populated cache database (optional)

**Process:**
1. Load settings from YAML file
2. Setup cache directory and database
3. Collect contributions from GitHub (if enabled)
4. Generate contributor data files (JSON)
5. Render HTML index with theme
6. Copy web assets and theme images
7. Output static website to specified directory

#### `deploy` - Deploy Website
Currently supports AWS S3 deployment.

**S3 Arguments:**
- `--bucket`: S3 bucket name (required)
- `--content-dir`: Location of built website files (required)

**Required Environment Variables:**
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

#### `serve` - Serve Website Locally
Runs a local HTTP server to preview the website.

**Arguments:**
- `--addr`: Server address (default: 127.0.0.1:8000)
- `--content-dir`: Website files location (default: current directory)
- `--graceful-shutdown`: Enable graceful shutdown (default: false)

### 2. GitHub Data Collection (`src/build/github.rs`)

**Collector Architecture:**
- Multi-token support for rate limit management
- Concurrent repository processing
- Incremental updates using cache database
- Connection pool for HTTP clients

**Data Collected:**
- **Commits:** SHA, author, timestamp, title, parent count
- **Issues:** Number, author, timestamp, title
- **Pull Requests:** Number, author, timestamp, title

**Environment Variables:**
- `GITHUB_TOKENS`: Comma-separated list of GitHub tokens (required)

**Rate Limiting:**
- Minimum rate limit threshold: 100 requests remaining
- Automatically switches between tokens

### 3. Database Layer (`src/build/db.rs`)

**DuckDB Schema:**

```sql
-- Cache tables
commit (owner, repository, sha, author_id, author_login, ts, title, parents)
issue (owner, repository, number, author_id, author_login, ts, title)
pull_request (owner, repository, number, author_id, author_login, ts, title)

-- Generated contribution view
contribution (kind, owner, repository, sha, number, author_id, author_login, ts, title)
```

**Key Queries:**
- `GET_ALL_CONTRIBUTORS_SUMMARIES`: Aggregates all contributions per user
- `GET_CONTRIBUTORS`: Lists all contributors with metadata
- Incremental insert with conflict resolution

### 4. Settings System (`src/build/settings.rs`)

**Configuration File Format (YAML):**

```yaml
# Organizations to scan (optional)
organizations:
  - org1
  - org2

# Individual repositories (optional)
repositories:
  - owner1/repo1
  - owner2/repo2

# Theme configuration (required)
theme:
  base_url: "https://example.com"
  email_subject: "Check out my contributions!"
  favicon_url: "https://..."
  logo_url: "https://..."
  og_description: "Description for social sharing"
  og_image_url: "https://..."
  og_title: "Page title"
  social_message: "Share message with hashtags"
```

### 5. Web Application (`web/src`)

**Framework:** SolidJS with TypeScript

**Key Features:**
- Client-side routing
- Lazy-loaded contributor data
- Search interface for contributors
- Share functionality (email, social media)
- Responsive design
- Badge system for contribution types

**Data Flow:**
1. Load all contributors list from `_all_contributors.json`
2. Fetch individual contributor details from `{username}.json` on demand
3. Display aggregated statistics and contribution timelines

**Components:**
- `Search`: Main search interface for finding contributors
- `Contributor`: Individual contributor card display
- `Badges`: Visual indicators for contribution types
- `ShareContributorLink`: Social sharing functionality

### 6. Build System (`build.rs`)

Custom Cargo build script that:
1. Checks for `yarn` in PATH
2. Runs `yarn install` in web directory
3. Runs `yarn build` to compile frontend
4. Embeds compiled assets into Rust binary via `rust-embed`

**Output:** `web/dist` directory embedded in final binary

## Development Workflow

### Prerequisites

```bash
# Required tools
- Rust 1.90.0 or higher
- Yarn package manager
- Git
- DuckDB (embedded, no separate install needed)

# Optional for deployment
- AWS CLI configured
- S3 bucket access
```

### Building the Project

```bash
# Install dependencies and build everything
cargo build --release

# The build script automatically:
# 1. Runs yarn install in web/
# 2. Builds the SolidJS app
# 3. Embeds web assets into the binary
```

### Running Tests

```bash
# Rust tests
cargo test

# Frontend linting
cd web
yarn lint
yarn format:diff
```

### Local Development

```bash
# Option 1: Use the serve command
cargo run -- serve --content-dir ./output

# Option 2: Frontend development server
cd web
yarn dev
```

### Creating a ContribCard Site

1. **Create settings file:**

```yaml
# mysettings.yml
organizations:
  - kubernetes
  - kubernetes-sigs

theme:
  base_url: "https://mysite.com"
  email_subject: "My Contributions"
  favicon_url: "https://..."
  logo_url: "https://..."
  og_description: "My contribution card"
  og_image_url: "https://..."
  og_title: "My ContribCard"
  social_message: "Check out my contributions!"
```

2. **Set GitHub tokens:**

```bash
export GITHUB_TOKENS="ghp_token1,ghp_token2,ghp_token3"
```

3. **Build the site:**

```bash
cargo run --release -- build \
  --name mysite \
  --settings-file mysettings.yml \
  --output-dir ./output
```

4. **Serve locally:**

```bash
cargo run -- serve --content-dir ./output
```

5. **Deploy (optional):**

```bash
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."

cargo run -- deploy s3 \
  --bucket my-bucket \
  --content-dir ./output
```

## CI/CD Pipeline

**GitHub Actions Workflows:**

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** Pull requests, merge queue

**Jobs:**

**lint-and-test-cli-tool:**
- Runs on: ubuntu-latest-16-cores
- Rust toolchain: 1.90.0
- Steps:
  - Run clippy (strict warnings as errors)
  - Run rustfmt
  - Run unit tests

**lint-and-test-webapp:**
- Runs on: ubuntu-latest
- Steps:
  - Cache node_modules
  - Run prettier format check
  - Run eslint

### 2. Build Image Workflow (`.github/workflows/build-image.yml`)

Builds and pushes Docker images to GitHub Container Registry (ghcr.io).

## Key Dependencies

### Rust Dependencies (Cargo.toml)

**Core:**
- `axum` (0.8.6): Web framework
- `tokio` (1.48.0): Async runtime
- `reqwest` (0.12.24): HTTP client
- `duckdb` (1.4.1): Embedded database
- `serde` (1.0.228): Serialization

**Utilities:**
- `askama` (0.14.0): Template engine
- `clap` (4.5.49): CLI parsing
- `chrono` (0.4.42): Date/time handling
- `anyhow` (1.0.100): Error handling
- `tracing` (0.1.41): Logging

**AWS:**
- `aws-config` (1.8.8): AWS SDK config
- `aws-sdk-s3` (1.108.0): S3 operations

**Other:**
- `rust-embed` (8.7.2): Asset embedding
- `deadpool` (0.12.3): Connection pooling
- `walkdir` (2.5.0): Directory traversal

### JavaScript Dependencies (web/package.json)

**Core:**
- `solid-js` (1.9.9): Reactive UI framework
- `@solidjs/router` (0.15.3): Routing
- `vite` (7.1.7): Build tool

**Dev Dependencies:**
- `typescript` (5.9.2)
- `eslint` (9.36.0)
- `prettier` (3.6.2)
- `vite-plugin-solid` (2.11.8)

## Data Flow

### Collection Phase

```
GitHub API
    ↓
HTTP Clients (pooled with tokens)
    ↓
Temporary DuckDB tables (commits, issues, pull_requests)
    ↓
Cache DuckDB database (persistent)
    ↓
Contribution aggregation query
    ↓
Individual contributor JSON files
```

### Serving Phase

```
Embedded Web Assets (in binary)
    ↓
Static Files + Data JSONs (on disk)
    ↓
Axum HTTP Server
    ↓
Browser (SolidJS app loads JSON data)
```

### Deployment Phase (S3)

```
Local Files
    ↓
MD5 checksum comparison
    ↓
Concurrent upload (50 files at a time)
    ↓
Index.html uploaded last (atomic deployment)
```

## Configuration & Environment Variables

### Build Time
- `GITHUB_TOKENS`: Required for collecting contributions (comma-separated)

### Deploy Time
- `AWS_REGION`: AWS region for S3
- `AWS_ACCESS_KEY_ID`: AWS credentials
- `AWS_SECRET_ACCESS_KEY`: AWS credentials

### Runtime (Serve)
- `RUST_LOG`: Logging level (default: `contribcard=debug`)

## Performance Characteristics

### Collection Performance
- **Concurrency:** Based on number of GitHub tokens provided
- **Rate Limiting:** Automatic token rotation
- **Caching:** Incremental updates after initial collection
- **Database:** In-memory aggregation for fast queries

### Build Performance
- **Web Assets:** Pre-compiled and embedded in binary
- **Template Rendering:** Compiled Askama templates
- **File Generation:** Parallelized JSON file writes

### Deployment Performance
- **S3 Upload:** 50 concurrent uploads
- **Change Detection:** MD5 checksums to skip unchanged files
- **Atomic Updates:** Index.html uploaded last

## Security Considerations

### GitHub Tokens
- Store in environment variables (not in config files)
- Use tokens with minimal required scopes
- Support multiple tokens for redundancy

### AWS Credentials
- Use IAM roles when possible
- Minimum required permissions: s3:PutObject, s3:ListBucket

### Data Privacy
- No PII collected beyond public GitHub profiles
- All data sourced from public GitHub API
- Caches stored locally (user's cache directory)

## Extensibility Points

### Adding New Data Sources
1. Implement collection logic in `src/build/github.rs`
2. Add database schema in `src/build/db.rs`
3. Update contribution aggregation queries

### Adding Deployment Providers
1. Create new module in `src/deploy/`
2. Add variant to `Provider` enum in `main.rs`
3. Implement deployment logic

### Customizing Themes
1. Update `Theme` struct in `settings.rs`
2. Modify template in `web/index.html`
3. Update CSS/components in `web/src/`

### Adding Contribution Types
1. Add new GitHub API endpoints in `github.rs`
2. Create database table in `db.rs`
3. Update contribution union query
4. Add UI badges in `web/src/layout/contributor/`

## Known Limitations

1. **GitHub Only:** Currently only supports GitHub as a data source
2. **Public Repositories:** Cannot access private repository data
3. **Rate Limits:** Dependent on GitHub API rate limits
4. **S3 Only:** Limited deployment options (only S3 currently)
5. **Theme Customization:** Limited to predefined theme options
6. **Beta Status:** Breaking changes expected in configuration format

## Troubleshooting

### Common Issues

**"GITHUB_TOKENS not provided"**
- Set environment variable: `export GITHUB_TOKENS="token1,token2"`

**"yarn not found in PATH"**
- Install yarn: `npm install -g yarn`

**Build fails with "error building web application"**
- Check Node.js version (should be modern LTS)
- Try: `cd web && yarn install && yarn build`

**"Rate limit exceeded"**
- Add more GitHub tokens to `GITHUB_TOKENS`
- Wait for rate limit reset (check token status)

**S3 deployment fails**
- Verify AWS credentials are set
- Check bucket permissions
- Ensure bucket exists and is accessible

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to file issues
- Pull request process
- Developer Certificate of Origin (DCO) requirements
- Code of Conduct

### Development Setup

```bash
# Clone repository
git clone https://github.com/cncf/contribcard.git
cd contribcard

# Install dependencies
cargo build

# Run tests
cargo test
cd web && yarn test

# Format code
cargo fmt
cd web && yarn format

# Lint
cargo clippy
cd web && yarn lint
```

## Maintainers

- Sergio Castaño Arteaga
- Cintia Sanchez Garcia

See [OWNERS](./OWNERS) file for complete list.

## License

Apache License 2.0 - See [LICENSE](./LICENSE) file.

## Related Projects

- [CLOTributor](https://clotributor.dev): CNCF project for finding contribution opportunities
- [DevStats](https://devstats.cncf.io): CNCF project analytics platform

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and release notes.

## Additional Resources

- **Live Demo:** https://contribcard.clotributor.dev
- **Issues:** https://github.com/cncf/contribcard/issues
- **Discussions:** https://github.com/cncf/contribcard/discussions
- **Container Images:** ghcr.io/cncf/contribcard

---

**Note:** This is an active project under development by the CNCF. The API and configuration formats may change in future releases.
