# Build CLI tool
FROM rust:1.96.1-alpine3.24 as builder
RUN apk --no-cache add musl-dev perl make libconfig-dev openssl-dev yarn g++ cmake openssl-libs-static git ninja
WORKDIR /contribcard
COPY src src
COPY web web
COPY build.rs ./
COPY askama.toml ./
COPY Cargo.* ./
WORKDIR /contribcard/src
RUN cargo build --release --locked

# Final stage
FROM alpine:3.24.1
RUN addgroup -S contribcard && adduser -S contribcard -G contribcard
USER contribcard
WORKDIR /home/contribcard
COPY --from=builder /contribcard/target/release/contribcard /usr/local/bin
