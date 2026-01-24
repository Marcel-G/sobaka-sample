# JWT Scripts

Unified scripts for generating and deploying JWT tokens for Sobaka services.

## Quick Reference

```bash
# Generate tokens (outputs to stdout)
./generate-jwt.sh --role worker              # Dev worker token
./generate-jwt.sh --role admin --env next    # Staging admin token
./generate-jwt.sh --role worker --env prod   # Production worker token

# Deploy tokens to AWS and optionally restart containers
./generate-jwt.sh --role worker --env next | ./deploy-jwt.sh --env next --service persistence
./generate-jwt.sh --role worker --env prod | ./deploy-jwt.sh --env prod --service persistence --restart
```

## Scripts

### generate-jwt.sh

Generates JWT tokens for any role and environment.

**Roles:**
- `worker` - For persistence service (can sync with all documents)
- `admin` - For administrative access (can edit global workspace lists)
- `client` - For regular users (default)

**Environments:**
- `dev` - Uses local secret (`JWT_PRIVATE_KEY` env var or default)
- `next` - Fetches secret from AWS Secrets Manager
- `prod` - Fetches secret from AWS Secrets Manager

**Examples:**
```bash
# Local development
./generate-jwt.sh --role worker --uuid my-worker

# Staging (fetches secret from AWS)
./generate-jwt.sh --role admin --env next

# Production with custom UUID
./generate-jwt.sh --role worker --env prod --uuid persistence-prod-1

# Quiet mode (just the token, for scripting)
TOKEN=$(./generate-jwt.sh --role worker -q)
```

### deploy-jwt.sh

Stores a JWT token in AWS Secrets Manager and optionally restarts the container.

**Reads the token from stdin** - designed to be piped from `generate-jwt.sh`.

**Examples:**
```bash
# Store worker JWT for staging
./generate-jwt.sh --role worker --env next | ./deploy-jwt.sh --env next --service persistence

# Store and restart container
./generate-jwt.sh --role worker --env prod | ./deploy-jwt.sh --env prod --service persistence --restart

# Dry run (preview what would happen)
./generate-jwt.sh --role worker --env next | ./deploy-jwt.sh --env next --service persistence --dry-run
```

## AWS Secrets Manager Naming

| Purpose | Secret Name |
|---------|-------------|
| JWT signing secret (next) | `sobaka-signaling-sobaka-next-jwt-secret` |
| JWT signing secret (prod) | `sobaka-signaling-sobaka-prod-jwt-secret` |
| Persistence worker JWT (next) | `sobaka-persistence-sobaka-next-jwt` |
| Persistence worker JWT (prod) | `sobaka-persistence-sobaka-prod-jwt` |

## One-Liner Examples

```bash
# Complete JWT rotation for staging with restart
./generate-jwt.sh --role worker --env next -q | ./deploy-jwt.sh --env next --service persistence --restart

# Generate an admin JWT for local testing
export JWT_PRIVATE_KEY="my-secret"
./generate-jwt.sh --role admin

# Store the token for browser use
TOKEN=$(./generate-jwt.sh --role admin)
echo "Set this cookie in your browser: jwt=$TOKEN"
```

## Convenience Wrappers

The persistence service has convenience wrappers:

```bash
# Start persistence in dev mode (generates worker JWT automatically)
apps/persistence/scripts/dev.sh

# Rotate persistence JWT for staging/prod
apps/persistence/scripts/rotate-jwt.sh --env next
apps/persistence/scripts/rotate-jwt.sh --env prod --restart
```
