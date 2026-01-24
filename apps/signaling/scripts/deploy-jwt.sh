#!/usr/bin/env bash
#
# Deploy JWT to AWS Secrets Manager and optionally restart container
#
# Reads a JWT token from stdin and stores it in AWS Secrets Manager.
# Optionally triggers a container restart via SSM.
#
# Usage:
#   # Store a worker JWT for staging
#   ./generate-jwt.sh --role worker --env next | ./deploy-jwt.sh --env next --service persistence
#
#   # Store and restart container
#   ./generate-jwt.sh --role worker --env prod | ./deploy-jwt.sh --env prod --service persistence --restart
#
#   # Just update the secret (piped from any source)
#   echo "my-jwt-token" | ./deploy-jwt.sh --env next --service signaling

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/../../.."

# Defaults
ENVIRONMENT=""
SERVICE=""
RESTART=false
DRY_RUN=false
TOKEN=""

# Colors
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
Deploy JWT to AWS Secrets Manager

USAGE:
    $(basename "$0") --env <env> --service <service> [OPTIONS]

    Reads the JWT token from stdin.

OPTIONS:
    --env <env>           Environment: next or prod (required)
    --service <service>   Service name: persistence or signaling (required)
    --restart             Trigger container restart via SSM after storing
    --dry-run             Show what would happen without making changes
    --help, -h            Show this help message

SECRETS MANAGER NAMING:
    The secret is stored as: sobaka-<service>-sobaka-<env>-jwt

EXAMPLES:
    # Generate and deploy a worker JWT to staging
    ./generate-jwt.sh --role worker --env next | ./deploy-jwt.sh --env next --service persistence

    # Deploy to production and restart
    ./generate-jwt.sh --role worker --env prod | ./deploy-jwt.sh --env prod --service persistence --restart

    # Preview what would happen
    ./generate-jwt.sh --role worker --env next | ./deploy-jwt.sh --env next --service persistence --dry-run

    # One-liner for complete rotation
    ./generate-jwt.sh --role worker --env next -q | ./deploy-jwt.sh --env next --service persistence --restart
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
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
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$ENVIRONMENT" ]; then
    log_error "Missing required option: --env"
    print_usage
    exit 1
fi

if [ -z "$SERVICE" ]; then
    log_error "Missing required option: --service"
    print_usage
    exit 1
fi

# Validate environment
case $ENVIRONMENT in
    next|prod) ;;
    dev)
        log_error "Cannot deploy to dev environment (it uses local secrets)"
        exit 1
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT (must be: next or prod)"
        exit 1
        ;;
esac

# Validate service
case $SERVICE in
    persistence|signaling) ;;
    *)
        log_error "Invalid service: $SERVICE (must be: persistence or signaling)"
        exit 1
        ;;
esac

# Read token from stdin
if [ -t 0 ]; then
    log_error "No token provided on stdin"
    log_info "Pipe the JWT token to this script:"
    log_info "  ./generate-jwt.sh --role worker --env $ENVIRONMENT | ./deploy-jwt.sh --env $ENVIRONMENT --service $SERVICE"
    exit 1
fi

TOKEN=$(cat)

if [ -z "$TOKEN" ]; then
    log_error "Empty token received on stdin"
    exit 1
fi

# Validate it looks like a JWT
if [[ ! "$TOKEN" =~ ^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]]; then
    log_warn "Token doesn't look like a valid JWT (expected format: eyXXX.XXX.XXX)"
fi

# Construct secret name
SECRET_NAME="sobaka-${SERVICE}-sobaka-${ENVIRONMENT}-jwt"

echo "" >&2
echo "╔═══════════════════════════════════════════════════════════╗" >&2
echo "║              JWT Deployment to AWS                         ║" >&2
echo "╚═══════════════════════════════════════════════════════════╝" >&2
echo "" >&2
log_info "Environment:  $ENVIRONMENT"
log_info "Service:      $SERVICE"
log_info "Secret Name:  $SECRET_NAME"
log_info "Restart:      $RESTART"
log_info "Token:        ${TOKEN:0:20}...${TOKEN: -10}"

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN MODE - No changes will be made"
fi
echo "" >&2

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

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would store JWT in $SECRET_NAME"
    if [ "$RESTART" = true ]; then
        log_warn "DRY RUN: Would trigger container restart via SSM"
    fi
    echo "" >&2
    log_success "Dry run complete"
    exit 0
fi

# Store in Secrets Manager
log_info "Storing JWT in Secrets Manager..."

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &> /dev/null; then
    # Update existing secret
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string "$TOKEN" \
        --output text > /dev/null || {
        log_error "Failed to update secret: $SECRET_NAME"
        exit 1
    }
    log_success "Updated existing secret: $SECRET_NAME"
else
    # Create new secret
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "JWT token for $SERVICE service ($ENVIRONMENT)" \
        --secret-string "$TOKEN" \
        --output text > /dev/null || {
        log_error "Failed to create secret: $SECRET_NAME"
        exit 1
    }
    log_success "Created new secret: $SECRET_NAME"
fi

if [ "$RESTART" = true ]; then
    echo "" >&2
    log_info "Triggering container restart..."
    
    # Check for terraform CLI
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform CLI not found. Cannot determine deployment targets."
        log_info "Install terraform or restart the container manually."
        exit 1
    fi
    
    # Map environment to terraform workspace
    TF_WORKSPACE="sobaka-${ENVIRONMENT}"
    
    log_info "Selecting Terraform workspace: $TF_WORKSPACE"
    if ! terraform -chdir="$REPO_ROOT/infrastructure" workspace select "$TF_WORKSPACE" &> /dev/null; then
        log_error "Failed to select Terraform workspace: $TF_WORKSPACE"
        log_info "Available workspaces:"
        terraform -chdir="$REPO_ROOT/infrastructure" workspace list
        exit 1
    fi
    
    # Get SSM document and instance from terraform
    SSM_DOC_OUTPUT="${SERVICE}_deploy_doc"
    SSM_DOCUMENT=$(terraform -chdir="$REPO_ROOT/infrastructure" output -raw "$SSM_DOC_OUTPUT" 2>/dev/null) || {
        log_error "Failed to get $SSM_DOC_OUTPUT from Terraform outputs"
        log_info "Make sure the infrastructure is deployed and outputs are defined"
        exit 1
    }
    
    INSTANCE_ID=$(terraform -chdir="$REPO_ROOT/infrastructure" output -raw instance_id 2>/dev/null) || {
        log_error "Failed to get instance_id from Terraform outputs"
        exit 1
    }
    
    log_info "SSM Document:  $SSM_DOCUMENT"
    log_info "Instance ID:   $INSTANCE_ID"
    
    log_info "Sending SSM command..."
    COMMAND_ID=$(aws ssm send-command \
        --document-name "$SSM_DOCUMENT" \
        --instance-ids "$INSTANCE_ID" \
        --query "Command.CommandId" \
        --output text) || {
        log_error "Failed to send SSM command"
        exit 1
    }
    
    log_success "Container restart triggered!"
    log_info "Command ID: $COMMAND_ID"
    echo "" >&2
    log_info "Check status with:"
    echo "  aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID" >&2
else
    echo "" >&2
    log_success "JWT stored successfully!"
    log_info "The service will use the new JWT on next restart."
    log_info "To restart now, run again with --restart flag."
fi

echo "" >&2
