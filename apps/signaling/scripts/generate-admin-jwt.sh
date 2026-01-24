#!/bin/bash
# Generate an Admin JWT token for the sobaka signaling server
#
# Usage:
#   ./scripts/generate-admin-jwt.sh
#
# Prerequisites:
#   - JWT_PRIVATE_KEY environment variable must be set
#   - cargo must be installed
#
# The generated JWT can be stored in your browser's local storage
# to gain admin access to the application.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check for JWT_PRIVATE_KEY
if [ -z "$JWT_PRIVATE_KEY" ]; then
    echo "Error: JWT_PRIVATE_KEY environment variable not set"
    echo ""
    echo "Set it before running this script:"
    echo "  export JWT_PRIVATE_KEY=your-secret-key"
    echo ""
    echo "Or source your .env file if you have one."
    exit 1
fi

cd "$PROJECT_DIR"

echo "Building generate-jwt binary..."
cargo build --release --bin generate-jwt 2>/dev/null

echo ""
echo "Generating Admin JWT..."
echo ""

# Generate the token
TOKEN=$(cargo run --release --bin generate-jwt -- --admin 2>/dev/null)

echo "============================================"
echo "Admin JWT Token:"
echo "============================================"
echo ""
echo "$TOKEN"
echo ""
echo "============================================"
echo ""
echo "To use this token:"
echo "1. Open your browser's developer console on the sobaka app"
echo "2. Run: localStorage.setItem('sobaka-user', JSON.stringify({uuid: 'YOUR_UUID'}))"
echo "   (Replace YOUR_UUID with the UUID printed above)"
echo "3. Refresh the page"
echo ""
echo "Note: The admin JWT should be configured in your browser's JWT cookie"
echo "or used with the signaling server's authentication mechanism."
