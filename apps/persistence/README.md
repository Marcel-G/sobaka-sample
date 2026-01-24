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
2. Connects to signaling server
3. Stores Yjs document updates in LMDB
4. Syncs with clients when they connect
5. Ensures documents aren't lost if all clients disconnect

## Development

The persistence worker needs to connect to the signaling server as a **Worker** peer (not a regular client). This requires a JWT token with `kind: "worker"`.

### Quick Start

```bash
# 1. Start the signaling server first (in another terminal)
cd ../signaling
JWT_PRIVATE_KEY=dev-secret cargo run

# 2. Run the persistence worker with the dev script
./scripts/dev.sh
```

The dev script automatically:
- Generates a worker JWT token
- Configures the correct environment
- Builds and runs the service

### Manual Setup

If you prefer manual configuration:

```bash
# Generate a worker JWT (from the signaling directory)
cd ../signaling
JWT_PRIVATE_KEY=dev-secret cargo run --bin generate-jwt -- --worker

# Copy the output token and set it as JWT env var
cd ../persistence
JWT=<paste-token-here> SIGNAL_SERVER=ws://localhost:8000/signaling cargo run
```

### Verbose Mode

```bash
# Run with debug logging
./scripts/dev.sh --verbose

# Or manually
RUST_LOG=debug,sobaka_client=trace cargo run
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SIGNAL_SERVER` | Signaling server WebSocket URL | `ws://localhost:8000/signaling` |
| `JWT` | Worker JWT token (required for worker identity) | None |
| `PUBLIC_IP` | Public IP for WebRTC candidates | Auto-detected |
| `PORT` | UDP port for WebRTC traffic | `3478` |
| `RUST_LOG` | Log level filter | `info` |
| `LOG_FORMAT` | Log output format (`json` or `pretty`) | `pretty` |
| `JWT_PRIVATE_KEY` | JWT signing secret (for dev script) | Required |

## Storage

Documents are stored in LMDB with the following structure:

```
data/
├── documents/    # Yjs document updates
└── metadata/     # Document metadata
```

### Document Keys

- Workspace documents: `workspace:{uuid}`
- User lists: `list:{uuid}`
- Root documents: `root:{uuid}`

## Building

```bash
# Debug build
cargo build

# Release build (with optimizations disabled due to LMDB)
cargo build --release
```

## Docker

```bash
# Build image
docker build -t sobaka-persistence .

# Run container with volume
docker run -v ./data:/data -p 8001:8001 sobaka-persistence
```

## Deployment

Infrastructure defined in `infrastructure/`:
- AWS ECS Fargate
- EBS volume for persistent storage
- Auto-recovery

## Data Flow

```
Client ←→ WebRTC ←→ Persistence Server ←→ LMDB
                            ↓
                    Other Clients (via WebRTC)
```

## Backup

LMDB files can be backed up while server is running:

```bash
# Copy data directory
cp -r data/ backup/$(date +%Y%m%d)/
```

For production, use:
- EBS snapshots (AWS)
- Scheduled backups
- Replication to S3

## Recovery

To restore from backup:

1. Stop server
2. Replace `data/` directory
3. Start server

## Performance

- LMDB is memory-mapped for fast reads
- Writes are crash-safe
- Handles thousands of documents
- Low memory footprint

## Monitoring

Metrics logged:
- Document count
- Storage size
- Active connections
- Sync operations

## Testing

```bash
cargo test
```

## Troubleshooting

### Database corruption

```bash
# Compact database
mdb_copy -c data/documents data/documents.compact
mv data/documents.compact data/documents
```

### High memory usage

LMDB uses memory mapping - this is normal. OS manages memory efficiently.

## Notes

- One instance per deployment (stateful)
- Not designed for horizontal scaling
- For multiple regions, use separate instances
- Consider document sharding for very large deployments
