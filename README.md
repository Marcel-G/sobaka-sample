# Sobaka

A collaborative modular synthesizer built with WebAssembly, Svelte, and Yjs.

## Overview

Sobaka is a real-time collaborative modular synthesizer that runs entirely in the browser. Multiple users can edit the same patch simultaneously using CRDT-based conflict-free synchronization.

## Architecture

This is a monorepo containing packages and applications:

```
sobaka-sample/
├── apps/              # Runnable applications
│   ├── web/          # SvelteKit web app
│   ├── signaling/    # WebRTC signaling server (Rust)
│   └── persistence/  # Document storage server (Rust)
└── packages/         # Reusable libraries
    ├── state/        # Yjs state management
    ├── dsp/          # Audio processing (Rust WASM + TypeScript)
    └── ui/           # UI component library + Storybook
```

See [MONOREPO.md](./MONOREPO.md) for detailed structure.

## Quick Start

### Prerequisites

- Node.js 18+
- Rust toolchain (for building WASM/servers)
- wasm-pack: `cargo install wasm-pack`

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Opens at http://localhost:5173

### Build for Production

```bash
npm run build
```

## Applications

### Web App (apps/web)

The main user-facing application. A SvelteKit static site with:
- Visual modular synthesizer interface
- Real-time collaboration via WebRTC
- Audio synthesis using WASM worklets
- Local and remote persistence

**Tech**: SvelteKit, Svelte 5, TailwindCSS, Web Audio API

### Signaling Server (apps/signaling)

WebRTC signaling server for peer discovery and connection setup.
- Handles SDP exchange
- ICE candidate relay
- Room management

**Tech**: Rust, WebSocket, Docker, AWS ECS

### Persistence Server (apps/persistence)

Optional server for long-term document storage.
- Stores Yjs documents in LMDB
- Acts as a persistent peer
- Ensures data isn't lost when all clients disconnect

**Tech**: Rust, Yjs, LMDB, WebRTC, Docker, AWS ECS

## Packages

### @sobaka/state

Core state management using Yjs CRDTs.
- Workspace models
- Document synchronization
- Real-time collaboration logic

### @sobaka/dsp

Audio processing layer combining Rust WASM and TypeScript.
- Audio worklet modules (Oscillator, Filter, Envelope, etc.)
- DSP algorithms in Rust (compiled to WASM)
- TypeScript management layer
- Near-native performance

### @sobaka/ui

Reusable UI component library.
- Module components (Clock, Oscillator, etc.)
- Shared components (Knob, Switch, Panel, etc.)
- Storybook for isolated development

## Development

### Run Web App

```bash
npm run dev:web
```

### Run Storybook (UI Development)

```bash
npm run storybook --workspace=packages/ui
```

### Build Packages

```bash
npm run build:packages
```

### Run Signaling Server

```bash
cd apps/signaling
cargo run
```

### Run Persistence Server

```bash
cd apps/persistence
cargo run
```

## Architecture Highlights

### Three-Layer Design

```
View Layer (Svelte)
    ↓
State Layer (Yjs)
    ↓
DSP Layer (WASM)
```

### Real-Time Collaboration

- **State**: Yjs CRDTs for conflict-free merges
- **Transport**: WebRTC for peer-to-peer sync
- **Signaling**: Lightweight server for peer discovery
- **Persistence**: Optional server for long-term storage

### Audio Processing

- **Worklets**: Audio runs in separate thread
- **WASM**: Rust-compiled modules for performance
- **Web Audio**: Native browser APIs for routing

## Deployment

### Web App

Static site deployed to AWS S3 + CloudFront:

```bash
cd apps/web
npm run build
# Deploy build/ to S3
```

### Servers

Docker images deployed to AWS ECS:

```bash
# Signaling
cd apps/signaling
docker build -t sobaka-signaling .

# Persistence
cd apps/persistence
docker build -t sobaka-persistence .
```

Infrastructure as code in `infrastructure/`.

## Documentation

- [MONOREPO.md](./MONOREPO.md) - Monorepo structure and package details
- [apps/web/ARCHITECTURE.md](./apps/web/ARCHITECTURE.md) - Frontend architecture
- [packages/dsp/ARCHITECTURE.md](./packages/dsp/ARCHITECTURE.md) - DSP layer details
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration notes

## Contributing

1. Clone repository
2. Install dependencies: `npm install`
3. Create branch: `git checkout -b feature/my-feature`
4. Make changes
5. Test: `npm run test`
6. Lint: `npm run lint`
7. Commit with conventional commits
8. Open pull request

## License

See [LICENSE](./LICENSE)

## Tech Stack Summary

- **Frontend**: SvelteKit, Svelte 5, TypeScript
- **Styling**: TailwindCSS 4
- **Build**: Vite, esbuild
- **State**: Yjs, SyncedStore
- **Audio**: Web Audio API, AudioWorklets
- **DSP**: Rust, WASM, wasm-pack, fundsp
- **Collaboration**: WebRTC, Y-CRDT
- **Servers**: Rust, Tokio, Tungstenite
- **Storage**: LMDB
- **Infrastructure**: Terraform, AWS (S3, CloudFront, ECS, ALB)
- **Monorepo**: npm workspaces

## Status

This is an active project. Core features working:
- ✅ Modular synthesis with 12+ modules
- ✅ Real-time collaboration
- ✅ WASM-based audio processing
- ✅ Local persistence
- ✅ Server persistence
- ✅ WebRTC peer-to-peer sync

See issues for planned features and improvements.
