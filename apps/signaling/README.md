# Sobaka Signaling Server

WebRTC signaling server for peer-to-peer connections in Sobaka.

## Overview

This Rust-based WebSocket server facilitates WebRTC peer connections for real-time collaboration. It handles:
- WebRTC signaling (SDP exchange)
- ICE candidate relay
- Topic/room management
- User identity verification via JWT

## Stack

- **Language**: Rust
- **Framework**: Warp (WebSocket server)
- **Deployment**: Docker + AWS ECS

## How It Works

1. Clients connect via WebSocket
2. Server verifies JWT and assigns identity
3. Server sends `welcome` message with identity and role
4. Clients exchange SDP offers/answers through server
5. ICE candidates are relayed
6. Direct peer-to-peer connection established
7. Server continues to relay signaling for new peers

## Development

```bash
# Start the signaling server
JWT_PRIVATE_KEY=dev-secret cargo run

# With debug logging
JWT_PRIVATE_KEY=dev-secret RUST_LOG=debug cargo run
```

Runs on port 8000 by default.

## JWT Scripts

The `scripts/` directory contains consolidated tools for JWT management:

### Generate Tokens

```bash
# Generate tokens for development (uses local secret)
./scripts/generate-jwt.sh --role worker
./scripts/generate-jwt.sh --role admin
./scripts/generate-jwt.sh --role client

# Generate tokens for staging/production (fetches secret from AWS)
./scripts/generate-jwt.sh --role worker --env next
./scripts/generate-jwt.sh --role admin --env prod

# With custom UUID
./scripts/generate-jwt.sh --role worker --uuid my-worker-id

# Quiet mode (just the token, for scripting)
TOKEN=$(./scripts/generate-jwt.sh --role worker -q)
```

### Deploy Tokens

```bash
# Store token in AWS Secrets Manager
./scripts/generate-jwt.sh --role worker --env next | \
  ./scripts/deploy-jwt.sh --env next --service persistence

# Store and restart container
./scripts/generate-jwt.sh --role worker --env prod | \
  ./scripts/deploy-jwt.sh --env prod --service persistence --restart
```

See `scripts/README.md` for full documentation.

### Token Roles

| Role | Purpose |
|------|---------|
| `client` | Regular browser clients (default) |
| `worker` | Persistence service and backend workers |
| `admin` | Administrative access (can edit global workspace lists) |

**Workers** receive special treatment:
- Receive `announce` messages for all topics
- Can persist and sync all documents
- Tracked separately from regular clients

**Admins** have elevated permissions:
- Can modify global workspace lists
- Treated like workers for signaling purposes

### Rust Binary

The JWT generator is also available as a Rust binary:

```bash
# Build
cargo build --bin generate-jwt

# Use directly
JWT_PRIVATE_KEY=dev-secret ./target/debug/generate-jwt --worker
JWT_PRIVATE_KEY=dev-secret ./target/debug/generate-jwt --admin --uuid admin-1
JWT_PRIVATE_KEY=dev-secret ./target/debug/generate-jwt --help
```

## Building

```bash
# Debug build (both binaries)
cargo build

# Release build
cargo build --release

# Build just the JWT generator
cargo build --bin generate-jwt
```

## Docker

```bash
# Build image
docker build -t sobaka-signaling .

# Run container
docker run -p 8000:8000 -e JWT_PRIVATE_KEY=your-secret sobaka-signaling
```

## Deployment

Infrastructure defined in `infrastructure/`:
- AWS ECS Fargate
- Application Load Balancer
- Auto-scaling

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_PRIVATE_KEY` | Secret key for signing JWT tokens | **Required** |
| `RUST_LOG` | Log level filter | `info,signaling=debug` |
| `LOG_FORMAT` | Log output format (`json` or `pretty`) | `pretty` |

> **Security Note**: Use a strong, random secret for `JWT_PRIVATE_KEY` in production. The same secret must be used by all services (signaling, persistence) to validate tokens.

## Protocol

### Message Types

```typescript
// Server → Client: Welcome (sent immediately after connection)
{ type: "welcome", identity: "uuid", kind: "client" | "worker" | "admin" }

// Client → Server: Subscribe to topics
{ type: "subscribe", topics: ["workspace-uuid"] }

// Client → Server: Publish to topic
{ type: "publish", topic: "workspace-uuid", data: { type: "announce" | "signal", ... } }

// Server → Client: Publish with verified identity
{ type: "publish", topic: "...", identity: "uuid", kind: "client", data: { ... } }

// Ping/Pong for keepalive
{ type: "ping" }
{ type: "pong" }
```

### Signaling Data Types

```typescript
// Announce presence in a topic
{ type: "announce", from: "peer-id" }

// WebRTC signaling
{ type: "signal", from: "peer-id", to: "peer-id", signal: { ... } }
```

## Security

- JWT-based identity verification
- Prevents message spoofing (identity added server-side)
- Role-based access control

## Monitoring

Logs output to stdout (JSON format for AWS CloudWatch).

## Testing

```bash
cargo test
```

## Notes

- Designed for ephemeral connections
- Does not persist any data
- Scales horizontally (stateless)
- Each client maintains own peer connections
