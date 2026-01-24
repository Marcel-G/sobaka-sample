//! Logging configuration for the persistence worker.
//!
//! This module sets up structured logging using `tracing` with support for:
//! - Environment-based log level filtering via `RUST_LOG`
//! - JSON output for production log aggregation via `LOG_FORMAT=json`
//! - Human-readable output for development (default)
//!
//! # Environment Variables
//!
//! - `RUST_LOG`: Controls log level filtering (default: `info,sobaka_client=debug`)
//!   Examples:
//!   - `RUST_LOG=debug` - Enable debug for all crates
//!   - `RUST_LOG=warn,sobaka_client=info` - Warn for deps, info for persistence
//!   - `RUST_LOG=sobaka_client::peer=trace` - Trace only for peer module
//!
//! - `LOG_FORMAT`: Controls output format
//!   - `json` - JSON lines format for log aggregation (Datadog, ELK, etc.)
//!   - `pretty` or unset - Human-readable colored output

use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// Initialize the logging subsystem.
///
/// This should be called once at application startup, before any logging occurs.
///
/// # Panics
///
/// Panics if the logging system has already been initialized.
pub fn init() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,sobaka_client=debug,str0m=warn"));

    let log_format = std::env::var("LOG_FORMAT").unwrap_or_default();

    if log_format == "json" {
        // JSON format for production - structured logs for aggregation
        tracing_subscriber::registry()
            .with(env_filter)
            .with(
                fmt::layer()
                    .json()
                    .with_target(true)
                    .with_thread_ids(true)
                    .with_file(true)
                    .with_line_number(true)
                    .with_span_events(FmtSpan::CLOSE),
            )
            .init();
    } else {
        // Pretty format for development - human readable with colors
        tracing_subscriber::registry()
            .with(env_filter)
            .with(
                fmt::layer()
                    .with_target(true)
                    .with_thread_ids(false)
                    .with_file(false)
                    .with_span_events(FmtSpan::CLOSE),
            )
            .init();
    }

    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        log_format = %if log_format == "json" { "json" } else { "pretty" },
        "Persistence worker logging initialized"
    );
}
