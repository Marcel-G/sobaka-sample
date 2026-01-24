#!/usr/bin/env bash
#
# Development script for running the persistence worker
#
# This script:
# 1. Generates a worker JWT token using the signaling scripts
# 2. Starts the persistence service with proper configuration
#
# Prerequisites:
# - The signaling server must be running first
#
# Usage:
#   ./scripts/dev.sh              # Run with defaults
#   ./scripts/dev.sh --verbose    # Run with debug logging

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERSISTENCE_DIR="$(dirname "$SCRIPT_DIR")"
SIGNALING_DIR="$PERSISTENCE_DIR/../signaling"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
VERBOSE=false
for arg in "$@"; do
    case $arg in
        --verbose|-v)
            VERBOSE=true
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Start the persistence worker in development mode."
            echo ""
            echo "OPTIONS:"
            echo "  --verbose, -v    Enable debug logging"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "ENVIRONMENT:"
            echo "  JWT_PRIVATE_KEY  JWT signing secret (default: 'dev-secret-do-not-use-in-production')"
            echo "  SIGNAL_SERVER    Signaling server URL (default: ws://localhost:8000/signaling)"
            echo "  PORT             UDP port for WebRTC (default: 3478)"
            echo ""
            exit 0
            ;;
    esac
done

# Default signaling server
export SIGNAL_SERVER="${SIGNAL_SERVER:-ws://localhost:8000/signaling}"

# Default port
export PORT="${PORT:-3478}"

# Set log level
if [ "$VERBOSE" = true ]; then
    export RUST_LOG="${RUST_LOG:-debug,sobaka_client=trace}"
else
    export RUST_LOG="${RUST_LOG:-info,sobaka_client=debug}"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Sobaka Persistence Worker (Development)         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Generate worker JWT using the consolidated script
log_info "Generating worker JWT token..."

export JWT=$("$SIGNALING_DIR/scripts/generate-jwt.sh" --role worker --env dev --uuid "persistence-dev-worker" -q)

if [ -z "$JWT" ]; then
    log_error "Failed to generate JWT token"
    exit 1
fi

log_success "Worker JWT generated"

echo ""
log_info "Configuration:"
echo "  Signal Server: $SIGNAL_SERVER"
echo "  UDP Port:      $PORT"
echo "  Log Level:     $RUST_LOG"
echo "  Worker UUID:   persistence-dev-worker"
echo ""

# Build and run persistence service
log_info "Building persistence service..."
cd "$PERSISTENCE_DIR"

if ! cargo build --quiet 2>/dev/null; then
    log_error "Failed to build persistence service"
    exit 1
fi

log_success "Build complete"
echo ""
log_info "Starting persistence worker..."
echo ""

# Run the service
exec cargo run --quiet
