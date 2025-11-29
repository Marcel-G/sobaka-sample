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
# From this directory
cargo run
```

Runs on port 8000 by default.

## Building

```bash
# Debug build
cargo build

# Release build
cargo build --release
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

- `PORT` - Server port (default: 8000)
- `RUST_LOG` - Log level (e.g., `info`, `debug`)

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
