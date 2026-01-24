#!/usr/bin/env bash
#
# Rotate the persistence worker JWT using AWS Secrets Manager
#
# This script:
# 1. Fetches the JWT signing secret from AWS Secrets Manager
# 2. Generates a new worker JWT token
# 3. Stores the token in AWS Secrets Manager for the persistence service
# 4. Optionally triggers a redeployment via SSM
#
# Usage:
#   ./scripts/rotate-jwt.sh                    # Use default environment (sobaka-next)
#   ./scripts/rotate-jwt.sh --env sobaka-prod  # Use production environment
#   ./scripts/rotate-jwt.sh --deploy           # Rotate and redeploy
#   ./scripts/rotate-jwt.sh --dry-run          # Show what would happen without making changes
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Terraform CLI (for --deploy, to fetch instance_id and SSM document name)
#   - The generate-jwt binary built (cargo build --bin generate-jwt in signaling/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERSISTENCE_DIR="$(dirname "$SCRIPT_DIR")"
SIGNALING_DIR="$PERSISTENCE_DIR/../signaling"
REPO_ROOT="$PERSISTENCE_DIR/../.."

# Default configuration
ENVIRONMENT="sobaka-next"
DRY_RUN=false
DEPLOY=false
WORKER_UUID="persistence-worker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Rotate the persistence worker JWT using AWS Secrets Manager.

OPTIONS:
    --env <name>     Environment name (default: sobaka-next)
                     Used to construct secret names:
                       - sobaka-signaling-<env>-jwt-secret (source)
                       - sobaka-persistence-<env>-jwt (destination)
    --uuid <uuid>    Worker UUID for the token (default: persistence-worker)
    --deploy         Trigger redeployment via SSM after rotating the JWT
    --dry-run        Show what would happen without making changes
    --help           Show this help message

EXAMPLES:
    # Rotate JWT for staging environment
    $0 --env sobaka-next

    # Rotate JWT for production
    $0 --env sobaka-prod

    # Rotate and redeploy
    $0 --env sobaka-next --deploy

    # Preview what would happen
    $0 --env sobaka-next --dry-run

SECRETS MANAGER NAMES:
    Source (JWT signing secret):  sobaka-signaling-<env>-jwt-secret
    Destination (Worker JWT):     sobaka-persistence-<env>-jwt
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
        --deploy)
            DEPLOY=true
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
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Construct secret names
SECRET_SOURCE="sobaka-signaling-${ENVIRONMENT}-jwt-secret"
SECRET_DEST="sobaka-persistence-${ENVIRONMENT}-jwt"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Persistence Worker JWT Rotation                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
log_info "Environment:    $ENVIRONMENT"
log_info "Source Secret:  $SECRET_SOURCE"
log_info "Dest Secret:    $SECRET_DEST"
log_info "Worker UUID:    $WORKER_UUID"
log_info "Deploy:         $DEPLOY"
if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN MODE - No changes will be made"
fi
echo ""

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install and configure it."
    exit 1
fi

# Check AWS credentials
log_info "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured or expired"
    log_info "Run 'aws configure' or set AWS_PROFILE"
    exit 1
fi
log_success "AWS credentials valid"

# Build the JWT generator
log_info "Building JWT generator..."
if ! cargo build --bin generate-jwt --manifest-path "$SIGNALING_DIR/Cargo.toml" --quiet 2>/dev/null; then
    log_error "Failed to build JWT generator"
    exit 1
fi
log_success "JWT generator built"

GENERATE_JWT="$SIGNALING_DIR/target/debug/generate-jwt"

# Fetch the JWT signing secret
log_info "Fetching JWT signing secret from Secrets Manager..."
JWT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_SOURCE" \
    --query "SecretString" \
    --output text 2>/dev/null) || {
    log_error "Failed to fetch secret: $SECRET_SOURCE"
    log_info "Make sure the secret exists and you have permission to access it"
    exit 1
}

if [ -z "$JWT_SECRET" ]; then
    log_error "JWT secret is empty"
    exit 1
fi
log_success "JWT signing secret retrieved"

# Generate the worker JWT
log_info "Generating worker JWT..."
WORKER_JWT=$(JWT_PRIVATE_KEY="$JWT_SECRET" "$GENERATE_JWT" --worker --uuid "$WORKER_UUID" 2>/dev/null)

if [ -z "$WORKER_JWT" ]; then
    log_error "Failed to generate worker JWT"
    exit 1
fi
log_success "Worker JWT generated"

# Show token info (from stderr of generate-jwt)
echo ""
JWT_PRIVATE_KEY="$JWT_SECRET" "$GENERATE_JWT" --worker --uuid "$WORKER_UUID" 2>&1 | grep -v "^ey" || true
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would store JWT in $SECRET_DEST"
    log_info "Token preview: ${WORKER_JWT:0:50}..."
    if [ "$DEPLOY" = true ]; then
        log_warn "DRY RUN: Would trigger deployment via SSM"
    fi
    echo ""
    log_success "Dry run complete"
    exit 0
fi

# Store the JWT in Secrets Manager
log_info "Storing worker JWT in Secrets Manager..."

# Check if secret exists
if aws secretsmanager describe-secret --secret-id "$SECRET_DEST" &> /dev/null; then
    # Update existing secret
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_DEST" \
        --secret-string "$WORKER_JWT" \
        --output text > /dev/null || {
        log_error "Failed to update secret: $SECRET_DEST"
        exit 1
    }
    log_success "Updated existing secret: $SECRET_DEST"
else
    # Create new secret
    aws secretsmanager create-secret \
        --name "$SECRET_DEST" \
        --description "Worker JWT for persistence service ($ENVIRONMENT)" \
        --secret-string "$WORKER_JWT" \
        --output text > /dev/null || {
        log_error "Failed to create secret: $SECRET_DEST"
        exit 1
    }
    log_success "Created new secret: $SECRET_DEST"
fi

echo ""
log_success "JWT rotation complete!"

if [ "$DEPLOY" = true ]; then
    echo ""
    log_info "Fetching deployment configuration from Terraform..."

    # Check for terraform CLI
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform CLI not found. Please install it or deploy manually."
        exit 1
    fi

    # Select the correct terraform workspace
    log_info "Selecting Terraform workspace: $ENVIRONMENT"
    if ! terraform -chdir="$REPO_ROOT/infrastructure" workspace select "$ENVIRONMENT" &> /dev/null; then
        log_error "Failed to select Terraform workspace: $ENVIRONMENT"
        log_info "Available workspaces:"
        terraform -chdir="$REPO_ROOT/infrastructure" workspace list
        exit 1
    fi

    # Get SSM document name and instance ID from terraform outputs
    SSM_DOCUMENT=$(terraform -chdir="$REPO_ROOT/infrastructure" output -raw persistence_deploy_doc 2>/dev/null) || {
        log_error "Failed to get persistence_deploy_doc from Terraform outputs"
        exit 1
    }

    INSTANCE_ID=$(terraform -chdir="$REPO_ROOT/infrastructure" output -raw instance_id 2>/dev/null) || {
        log_error "Failed to get instance_id from Terraform outputs"
        exit 1
    }

    log_info "SSM Document:   $SSM_DOCUMENT"
    log_info "Instance ID:    $INSTANCE_ID"

    log_info "Triggering deployment via SSM..."
    COMMAND_ID=$(aws ssm send-command \
        --document-name "$SSM_DOCUMENT" \
        --instance-ids "$INSTANCE_ID" \
        --query "Command.CommandId" \
        --output text) || {
        log_error "Failed to send SSM command"
        exit 1
    }

    log_success "Deployment triggered!"
    log_info "Command ID: $COMMAND_ID"
    echo ""
    log_info "To check deployment status:"
    echo ""
    echo "  aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID"
    echo ""
else
    echo ""
    log_info "The persistence service will use the new JWT on next restart."
    log_info "To redeploy now, run again with --deploy flag:"
    echo ""
    echo "  $0 --env $ENVIRONMENT --deploy"
    echo ""
fi
