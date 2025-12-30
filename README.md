# Sobaka

A real-time collaborative modular synthesizer that runs in the browser. Multiple users can edit the same patch simultaneously.

## Structure

```
apps/
├── web/          # SvelteKit web app
├── signaling/    # WebRTC signaling server (Rust)
└── persistence/  # Document storage server (Rust)

packages/
├── state/        # Yjs-based state management
├── dsp/          # Audio processing (Rust WASM + TypeScript)
└── ui/           # Component library + Storybook
```

## Getting Started

**Prerequisites:** Node.js 18+, Rust toolchain, wasm-pack

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Development

```bash
# Web app
npm run dev:web

# UI components in Storybook
npm run storybook --workspace=packages/ui

# Build packages
npm run build:packages

# Signaling server
cd apps/signaling && cargo run

# Persistence server
cd apps/persistence && cargo run
```
