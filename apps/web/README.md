# Sobaka Web App

The main SvelteKit web application for Sobaka - a collaborative modular synthesizer.

## Overview

This is the frontend web application that users interact with. It provides:

- Visual modular synthesizer interface
- Real-time collaboration
- Audio synthesis and routing
- Workspace management

## Stack

- **Framework**: SvelteKit (Svelte 5)
- **Styling**: TailwindCSS 4
- **Build**: Vite
- **Type Safety**: TypeScript

## Dependencies

- `@sobaka/state` - State management and collaboration
- `@sobaka/dsp` - Audio processing (WASM + TypeScript)
- `@sobaka/ui` - UI component library

## Development

```bash
# From repository root
npm run dev:web

# Or from this directory
npm run dev
```

Opens at http://localhost:5173

## Building

```bash
npm run build
```

Outputs to `build/` directory (static site).

## Architecture

The app follows a three-layer architecture:

```
View (Svelte Components)
    ↓
State (Yjs Models)
    ↓
DSP (WASM Audio Worklets)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Deployment

This is a static site that can be deployed to:

- AWS S3 + CloudFront (current setup - see `infrastructure/`)
- Vercel
- Netlify
- Any static hosting

## Environment Variables

None required for basic operation. The app connects to:

- Signaling server (configurable via server response)
- Persistence server (optional, for long-term storage)

## Key Features

### Modular Synthesis

- Visual patch cable routing
- Real-time audio processing via Web Audio API
- WASM-based audio worklets for performance

### Collaboration

- Real-time collaborative editing via Yjs + WebRTC
- Presence indicators (avatars)
- Conflict-free state synchronization

### Workspace Management

- Create/fork workspaces
- Share via URL
- Local persistence (IndexedDB)
- Optional server persistence

## Directory Structure

```
src/
├── routes/              # SvelteKit pages
├── components/          # App-specific components
├── context/             # Global contexts (audio, workspace)
└── workspace/           # Workspace canvas component
```

## Testing

```bash
npm run test
```

## Linting

```bash
npm run lint
npm run format
```
