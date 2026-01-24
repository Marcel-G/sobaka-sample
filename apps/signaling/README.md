# Sobaka Signaling Server

WebRTC signaling server for peer-to-peer connections in Sobaka.

## Overview

This Rust-based WebSocket server facilitates WebRTC peer connections for real-time collaboration. It handles:
- WebRTC signaling (SDP exchange)
- ICE candidate relay
- Room management
- User identity verification

## Stack

- **Language**: Rust
- **Framework**: Custom WebSocket server
- **Deployment**: Docker + AWS ECS

## How It Works

1. Clients connect via WebSocket
2. Server assigns verified user UUIDs
3. Clients exchange SDP offers/answers through server
4. ICE candidates are relayed
5. Direct peer-to-peer connection established
6. Server no longer needed (peers communicate directly)

## Development

```bash
# Start the signaling server
JWT_PRIVATE_KEY=dev-secret cargo run

# Or with debug logging
JWT_PRIVATE_KEY=dev-secret RUST_LOG=debug cargo run
```

Runs on port 8000 by default.

## JWT Token Generator

The signaling server includes a CLI tool for generating JWT tokens. This is used to create **worker** tokens for the persistence service.

```bash
# Generate a worker token (for persistence service)
JWT_PRIVATE_KEY=dev-secret cargo run --bin generate-jwt -- --worker

# Generate with a custom UUID
JWT_PRIVATE_KEY=dev-secret cargo run --bin generate-jwt -- --worker --uuid my-worker

# Generate a client token (for testing)
JWT_PRIVATE_KEY=dev-secret cargo run --bin generate-jwt -- --client

# See all options
cargo run --bin generate-jwt -- --help
```

### Token Types

| Type | Purpose |
|------|---------|
| `client` | Regular browser clients (default) |
| `worker` | Persistence service and other backend workers |

Workers receive special treatment:
- They receive `announce` messages for all topics
- They can persist and sync documents
- They're tracked separately from regular clients

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
docker run -p 8000:8000 sobaka-signaling
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

WebSocket messages are JSON:

```json
// Client → Server: Join room
{"type": "join", "room": "workspace-uuid"}

// Server → Client: Peer joined
{"type": "peer-joined", "peer": "peer-uuid"}

// Client → Server: Send offer
{"type": "offer", "to": "peer-uuid", "sdp": "..."}

// Server → Client: Receive offer
{"type": "offer", "from": "peer-uuid", "sdp": "..."}
```

See `src/` for full protocol implementation.

## Security

- Verifies user identity
- Prevents message spoofing
- Rate limiting (TODO)
- CORS configuration

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
