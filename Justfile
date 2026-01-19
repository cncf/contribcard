# ContribCard Justfile

site_name := "contribcard"
settings_file := "settings/site-name.yml"
output_dir := "output"
serve_addr := "127.0.0.1:8000"

# Build the contribcard website
build:
    cargo build --release
    cargo run --release -- build \
        --name {{site_name}} \
        --settings-file {{settings_file}} \
        --output-dir {{output_dir}} \
        --collect-contributions false

# Serve the website locally (builds first if needed)
serve: build
    @echo "Starting server at http://{{serve_addr}}"
    cargo run --release -- serve \
        --content-dir {{output_dir}} \
        --addr {{serve_addr}}
