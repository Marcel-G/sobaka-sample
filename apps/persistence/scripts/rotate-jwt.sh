#!/usr/bin/env bash
#
# Rotate the persistence worker JWT
#
# This is a convenience wrapper around the signaling scripts.
# For full options, use the signaling scripts directly:
#   apps/signaling/scripts/generate-jwt.sh
#   apps/signaling/scripts/deploy-jwt.sh
#
# Usage:
#   ./scripts/rotate-jwt.sh                    # Staging (sobaka-next)
#   ./scripts/rotate-jwt.sh --env prod         # Production
#   ./scripts/rotate-jwt.sh --env next --restart   # Rotate and restart

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIGNALING_SCRIPTS="$SCRIPT_DIR/../../signaling/scripts"

# Defaults
ENVIRONMENT="next"
RESTART=false
DRY_RUN=false
WORKER_UUID="persistence-worker"

print_usage() {
    cat <<EOF
Rotate the persistence worker JWT

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --env <env>      Environment: next or prod (default: next)
    --uuid <uuid>    Worker UUID (default: persistence-worker)
    --restart        Restart the container after rotating
    --dry-run        Show what would happen without making changes
    --help           Show this help message

EXAMPLES:
    # Rotate JWT for staging
    $0 --env next

    # Rotate JWT for production and restart
    $0 --env prod --restart

    # Preview what would happen
    $0 --env next --dry-run

This script uses:
    $SIGNALING_SCRIPTS/generate-jwt.sh
    $SIGNALING_SCRIPTS/deploy-jwt.sh
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --uuid)
            WORKER_UUID="$2"
            shift 2
            ;;
        --restart)
            RESTART=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            print_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            print_usage
            exit 1
            ;;
    esac
done

# Build deploy args
DEPLOY_ARGS=("--env" "$ENVIRONMENT" "--service" "persistence")

if [ "$RESTART" = true ]; then
    DEPLOY_ARGS+=("--restart")
fi

if [ "$DRY_RUN" = true ]; then
    DEPLOY_ARGS+=("--dry-run")
fi

# Run the scripts
"$SIGNALING_SCRIPTS/generate-jwt.sh" \
    --role worker \
    --env "$ENVIRONMENT" \
    --uuid "$WORKER_UUID" \
    | "$SIGNALING_SCRIPTS/deploy-jwt.sh" "${DEPLOY_ARGS[@]}"
