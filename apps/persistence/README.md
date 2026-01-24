# Sobaka Persistence Server

Long-term storage and synchronization server for Yjs documents.

## Overview

This Rust-based server provides:
- Persistent storage of Yjs documents (LMDB)
- Document synchronization for clients
- WebRTC peer for Y-CRDT updates
- Backup and recovery

## Stack

- **Language**: Rust
- **Storage**: LMDB (Lightning Memory-Mapped Database)
- **Protocol**: Yjs sync protocol over WebRTC
- **Deployment**: Docker + AWS ECS

## How It Works

1. Server acts as a persistent WebRTC peer
2. Connects to signaling server as a **worker** (receives all document updates)
3. Stores Yjs document updates in LMDB
4. Syncs with clients when they connect
5. Ensures documents aren't lost if all clients disconnect

## Development

### Quick Start

```bash
# 1. Start the signaling server first (in another terminal)
cd ../signaling
JWT_PRIVATE_KEY=dev-secret cargo run

# 2. Run the persistence worker with the dev script
./scripts/dev.sh
```

The dev script automatically:
- Generates a worker JWT token using the signaling scripts
- Configures the correct environment
- Builds and runs the service

### Verbose Mode

```bash
./scripts/dev.sh --verbose
```

### Manual Setup

If you prefer manual configuration:

```bash
# Generate a worker JWT
../signaling/scripts/generate-jwt.sh --role worker --uuid persistence-dev

# Copy the output token and set it as JWT env var
JWT=<paste-token-here> SIGNAL_SERVER=ws://localhost:8000/signaling cargo run
```

## JWT Rotation (Staging/Production)

For deployed environments, use the rotation script:

```bash
# Rotate JWT for staging
./scripts/rotate-jwt.sh --env next

# Rotate JWT for production
./scripts/rotate-jwt.sh --env prod

# Rotate and restart the container
./scripts/rotate-jwt.sh --env prod --restart

# Preview what would happen
./scripts/rotate-jwt.sh --env next --dry-run
```

The rotation script:
1. Fetches the JWT signing secret from AWS Secrets Manager
2. Generates a new worker JWT
3. Stores it in AWS Secrets Manager
4. Optionally triggers a container restart via SSM

See `../signaling/scripts/README.md` for full documentation on JWT scripts.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SIGNAL_SERVER` | Signaling server WebSocket URL | `ws://localhost:8000/signaling` |
| `JWT` | Worker JWT token (required for worker identity) | None |
| `PUBLIC_IP` | Public IP for WebRTC candidates | Auto-detected |
| `PORT` | UDP port for WebRTC traffic | `3478` |
| `RUST_LOG` | Log level filter | `info` |
| `LOG_FORMAT` | Log output format (`json` or `pretty`) | `pretty` |

## Storage

Documents are stored in LMDB:

```
.db/
├── data.mdb     # Main data file
└── lock.mdb     # Lock file
```

### Document Keys

- Workspace documents: `workspace:{uuid}`
- User lists: `list:{uuid}`

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
docker build -t sobaka-persistence .

# Run container with volume
docker run -v ./data:/data -p 3478:3478/udp sobaka-persistence
```

## Deployment

Infrastructure defined in `infrastructure/`:
- AWS ECS on EC2 (for UDP support)
- EBS volume for persistent storage
- SSM for container management

## Data Flow

```
Client ←→ WebRTC ←→ Persistence Server ←→ LMDB
                            ↓
                    Other Clients (via WebRTC)
```

## Backup

LMDB files can be backed up while server is running:

```bash
cp -r .db/ backup/$(date +%Y%m%d)/
```

For production, use EBS snapshots.

## Recovery

To restore from backup:

1. Stop server
2. Replace `.db/` directory
3. Start server

## Performance

- LMDB is memory-mapped for fast reads
- Writes are crash-safe
- Handles thousands of documents
- Low memory footprint

## Troubleshooting

### Connection Issues

Check that:
1. Signaling server is running
2. JWT token is valid and has `kind: "worker"`
3. UDP port is accessible

### High Memory Usage

LMDB uses memory mapping - this is normal. The OS manages memory efficiently.

## Notes

- One instance per deployment (stateful)
- Not designed for horizontal scaling
- For multiple regions, use separate instances
