#!/usr/bin/env bash
#
# Unified JWT Token Generator for Sobaka
#
# Generates JWT tokens for any role (worker, admin, client) and environment (dev, next, prod).
#
# For dev: Uses a local secret (provided via --secret or defaults to dev secret)
# For next/prod: Fetches the JWT signing secret from AWS Secrets Manager
#
# Usage:
#   ./generate-jwt.sh --role worker                           # Dev environment (default)
#   ./generate-jwt.sh --role admin --env next                 # Fetch secret from AWS
#   ./generate-jwt.sh --role worker --env prod --uuid my-id   # Production with custom UUID
#   ./generate-jwt.sh --role worker --secret "my-secret"      # Use explicit secret
#
# The token is printed to stdout, all other output goes to stderr.
# This allows easy piping: TOKEN=$(./generate-jwt.sh --role worker)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIGNALING_DIR="$(dirname "$SCRIPT_DIR")"

# Defaults
ROLE="client"
ENVIRONMENT="dev"
CUSTOM_UUID=""
CUSTOM_SECRET=""
QUIET=false

# Colors for output (to stderr)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[OK]${NC} $1" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

print_usage() {
    cat >&2 <<EOF
Unified JWT Token Generator for Sobaka

USAGE:
    $(basename "$0") [OPTIONS]

OPTIONS:
    --role <role>       Token role: worker, admin, or client (default: client)
    --env <env>         Environment: dev, next, or prod (default: dev)
    --uuid <uuid>       Custom UUID for the token (default: auto-generated)
    --secret <secret>   Use this secret instead of fetching from AWS
    --quiet, -q         Only output the token, suppress all other output
    --help, -h          Show this help message

ENVIRONMENTS:
    dev     Uses local secret (JWT_PRIVATE_KEY env var or default dev secret)
    next    Fetches secret from AWS: sobaka-signaling-sobaka-next-jwt-secret
    prod    Fetches secret from AWS: sobaka-signaling-sobaka-prod-jwt-secret

EXAMPLES:
    # Generate a worker token for local development
    $(basename "$0") --role worker

    # Generate an admin token for staging (fetches secret from AWS)
    $(basename "$0") --role admin --env next

    # Generate a worker token for production with specific ID
    $(basename "$0") --role worker --env prod --uuid persistence-prod-worker

    # Use in a script (quiet mode, just the token)
    TOKEN=\$($(basename "$0") --role worker -q)

    # Pipe to deploy script
    $(basename "$0") --role worker --env next | ./deploy-jwt.sh --env next

OUTPUT:
    The JWT token is printed to stdout.
    All status messages go to stderr.
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --role)
            ROLE="$2"
            shift 2
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --uuid)
            CUSTOM_UUID="$2"
            shift 2
            ;;
        --secret)
            CUSTOM_SECRET="$2"
            shift 2
            ;;
        --quiet|-q)
            QUIET=true
            shift
            ;;
        --help|-h)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Validate role
case $ROLE in
    worker|admin|client) ;;
    *)
        log_error "Invalid role: $ROLE (must be: worker, admin, or client)"
        exit 1
        ;;
esac

# Validate environment
case $ENVIRONMENT in
    dev|next|prod) ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT (must be: dev, next, or prod)"
        exit 1
        ;;
esac

if [ "$QUIET" = false ]; then
    log_info "Generating $ROLE JWT for $ENVIRONMENT environment"
fi

# Get the JWT secret
if [ -n "$CUSTOM_SECRET" ]; then
    JWT_SECRET="$CUSTOM_SECRET"
    if [ "$QUIET" = false ]; then
        log_info "Using provided secret"
    fi
elif [ "$ENVIRONMENT" = "dev" ]; then
    # For dev, use environment variable or default
    JWT_SECRET="${JWT_PRIVATE_KEY:-dev-secret-do-not-use-in-production}"
    if [ "$QUIET" = false ]; then
        if [ -z "${JWT_PRIVATE_KEY:-}" ]; then
            log_warn "Using default dev secret (set JWT_PRIVATE_KEY for custom)"
        else
            log_info "Using JWT_PRIVATE_KEY from environment"
        fi
    fi
else
    # For next/prod, fetch from AWS Secrets Manager
    SECRET_NAME="sobaka-signaling-sobaka-${ENVIRONMENT}-jwt-secret"
    
    if [ "$QUIET" = false ]; then
        log_info "Fetching secret from AWS: $SECRET_NAME"
    fi
    
    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Install it or use --secret to provide the secret manually."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or expired"
        log_info "Run 'aws configure' or set AWS_PROFILE"
        exit 1
    fi
    
    JWT_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id "$SECRET_NAME" \
        --query "SecretString" \
        --output text 2>/dev/null) || {
        log_error "Failed to fetch secret: $SECRET_NAME"
        log_info "Make sure the secret exists and you have permission to access it"
        exit 1
    }
    
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT secret is empty"
        exit 1
    fi
    
    if [ "$QUIET" = false ]; then
        log_success "Secret retrieved from AWS"
    fi
fi

# Build the JWT generator if needed
GENERATE_JWT="$SIGNALING_DIR/target/release/generate-jwt"
if [ ! -f "$GENERATE_JWT" ]; then
    GENERATE_JWT="$SIGNALING_DIR/target/debug/generate-jwt"
fi

if [ ! -f "$GENERATE_JWT" ]; then
    if [ "$QUIET" = false ]; then
        log_info "Building JWT generator..."
    fi
    if ! cargo build --bin generate-jwt --manifest-path "$SIGNALING_DIR/Cargo.toml" --quiet 2>/dev/null; then
        log_error "Failed to build JWT generator"
        exit 1
    fi
    GENERATE_JWT="$SIGNALING_DIR/target/debug/generate-jwt"
fi

# Build the command
CMD_ARGS=("--$ROLE")
if [ -n "$CUSTOM_UUID" ]; then
    CMD_ARGS+=("--uuid" "$CUSTOM_UUID")
fi

# Generate the token
TOKEN=$(JWT_PRIVATE_KEY="$JWT_SECRET" "$GENERATE_JWT" "${CMD_ARGS[@]}" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    log_error "Failed to generate JWT token"
    exit 1
fi

# Output the token to stdout
echo "$TOKEN"

# Show additional info to stderr (unless quiet)
if [ "$QUIET" = false ]; then
    echo "" >&2
    JWT_PRIVATE_KEY="$JWT_SECRET" "$GENERATE_JWT" "${CMD_ARGS[@]}" 2>&1 | grep -v "^ey" >&2 || true
    log_success "Token generated successfully"
fi
