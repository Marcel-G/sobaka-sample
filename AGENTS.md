# Sobaka — Agent Guide

Sobaka is a real-time collaborative modular synthesizer that runs in the browser. Multiple users edit the same audio patch simultaneously via WebRTC and Yjs CRDTs. The codebase is a monorepo with a SvelteKit frontend, Rust WASM audio DSP, Rust backend servers, and shared TypeScript packages.

## Design Principles

1. **Layer Separation** — DSP (`@sobaka/dsp`), State (`@sobaka/state`), and UI (`@sobaka/ui`) are fully decoupled packages. DSP has no knowledge of UI or Yjs. State has no knowledge of UI or audio. UI has no audio processing logic. The web app (`apps/web`) wires them together via the plugin registry (`apps/web/src/plugins.ts`).

2. **Plugin Architecture** — New synth modules are added by registering a plugin that couples a DSP node (`ModuleDSP` interface from `packages/dsp`) with a UI component (`BaseModuleProps` from `packages/ui`). The system handles state persistence, network sync, audio graph reconciliation, and rendering automatically.

3. **CRDT-First Collaboration** — All mutable state flows through Yjs documents (`SyncedDoc<K>` base class in `packages/state/src/models/syncedDoc.ts`). Never mutate state outside of Yjs. Conflicts are resolved automatically by the CRDT.

4. **Reactive Reconciliation** — The audio graph (`packages/dsp/src/graph.ts`) reconciles declaratively from state. When Yjs state changes, a derived store triggers `AudioGraph.reconcile(modules, links)` which diffs and applies changes with crossfades to prevent audio artifacts.

5. **Document Validation Gates** — Every `SyncedDoc` validates its kind and structure before applying updates. Corrupt documents are marked invalid, writes are blocked, and local storage is cleared. Never bypass validation.

6. **Factory + Lazy Loading** — Documents and workspaces are loaded on demand via `SyncedDocFactory<T>`. Instances are cached. Don't eagerly load documents.

7. **Svelte 5 Exclusively** — Uses runes API only: `$props()`, `$state()`, `$derived()`, `$effect()`. No Svelte 4 patterns: no `export let` for props, no `<slot>` (use `{#snippet}`/`{@render}`), no `$:` reactive statements.

8. **Graceful Audio Lifecycle** — Modules fade in after connecting and fade out before disconnecting. The reconcile order is: create → connect → fade in new; fade out old → disconnect → destroy. Never abruptly connect/disconnect audio nodes.

## Prerequisites

- Node.js 22+ and npm 10+
- Rust nightly toolchain with `wasm32-unknown-unknown` target
- `wasm-pack`

## Monorepo Structure

```
apps/web/          - SvelteKit frontend (Svelte 5, Vite, TailwindCSS 4)     [npm workspace]
apps/signaling/    - WebRTC signaling server (Rust, Warp, Tokio)             [cargo only]
apps/persistence/  - Document persistence worker (Rust, Tokio, str0m)        [cargo only]
packages/dsp/      - Audio DSP: Rust WASM processors + TS node wrappers     [npm workspace]
packages/state/    - Yjs CRDT state management + networking (TypeScript)     [npm workspace]
packages/ui/       - Svelte component library + Storybook                    [npm workspace]
infrastructure/    - Terraform AWS configs
```

Only `packages/*` and `apps/web` are npm workspaces. Rust apps are standalone Cargo projects — use `cargo` commands directly in their directories.

## Common Commands

```bash
npm install                # Install all JS/TS dependencies
npm run dev                # Web dev server at localhost:5173
npm run build              # Build all workspaces (WASM + TS)
npm run build:wasm         # Build only the WASM package
npm run check              # Type check all workspaces
npm run lint               # Lint all workspaces
npm run format             # Format all workspaces
npm run test               # Run JS/TS tests across workspaces
```

Rust servers (run from their directories):
```bash
cd apps/signaling && cargo run       # Signaling server
cd apps/persistence && cargo run     # Persistence worker
```

## Verification Checklist

Run before considering work complete:

1. `npm run build` — full build succeeds (WASM + all TS workspaces)
2. `npm run check` — type checking passes
3. `npm run lint` — linting passes
4. `npm run test` — all JS/TS tests pass
5. `cd apps/signaling && cargo test` — signaling server tests pass
6. `cd apps/persistence && cargo test` — persistence worker tests pass
7. `cd packages/dsp && cargo test` — DSP Rust tests pass

For small, scoped changes: run only the relevant workspace checks. For cross-cutting changes: run the full checklist.

## Git Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- **Scopes:** `web`, `signaling`, `persistence`, `dsp`, `ui`, `state`, `infra`
- Imperative mood, lowercase, no trailing period
- Atomic commits — one logical change per commit

## Adding New Modules

This is the most common extension point. To add a new synth module:

1. **DSP node:** `packages/dsp/src/module/<name>/node.ts` — implement the `ModuleDSP` interface
2. **Rust processor** (if needed): `packages/dsp/src/module/<name>/processor.rs` — implement `waw::Processor`
3. **UI component:** `packages/ui/src/modules/<Name>.svelte` — use `BaseModuleProps` + node prop
4. **Export:** add to `packages/ui/src/modules/index.ts`
5. **Register plugin:** add to `apps/web/src/plugins.ts` with type, category, initialState, createNode, component

The plugin registry then handles state persistence, network sync, audio graph wiring, and UI rendering automatically.

## Key Gotchas

- **WASM before web:** WASM must build before the web app. `npm run build` handles ordering automatically.
- **Rust nightly required:** The DSP package requires Rust nightly for WASM compilation. Stable will fail.
- **Rust apps aren't npm workspaces:** `apps/signaling` and `apps/persistence` have no `package.json`. Use `cargo` directly.
- **Default branch:** `master` (not `main`). `next` is the staging branch.
- **State access:** Use `intoReadable(node.state)` for Svelte store compatibility. Don't create parallel state outside Yjs.
- **Connection rules:** Audio graph connections must be Output → {Input, Param, Mixer}. Validated by `AudioGraph`.
