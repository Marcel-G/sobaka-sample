# Project Structure Overview

## Directory Layout

```
sobaka-sample/
│
├── apps/                           # 🚀 Runnable Applications
│   ├── web/                       # Web application (SvelteKit)
│   │   ├── src/
│   │   │   ├── routes/           # Pages and routing
│   │   │   ├── components/       # App-specific components
│   │   │   ├── context/          # Global contexts
│   │   │   └── workspace/        # Workspace canvas
│   │   ├── infrastructure/       # Terraform (AWS deployment)
│   │   └── package.json
│   │
│   ├── signaling/                 # Signaling server (Rust)
│   │   ├── src/                  # WebSocket signaling logic
│   │   ├── infrastructure/       # Terraform (AWS ECS)
│   │   ├── Dockerfile
│   │   └── Cargo.toml
│   │
│   └── persistence/               # Storage server (Rust)
│       ├── src/                  # Yjs sync + LMDB storage
│       ├── infrastructure/       # Terraform (AWS ECS + EBS)
│       ├── Dockerfile
│       └── Cargo.toml
│
├── packages/                       # 📦 Reusable Libraries
│   ├── state/                     # @sobaka/state
│   │   ├── src/
│   │   │   ├── models/           # Yjs models (Workspace, etc.)
│   │   │   └── util/             # State utilities
│   │   ├── dist/                 # Compiled output
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── dsp/                       # @sobaka/dsp
│   │   ├── src/                  # Rust audio worklets
│   │   │   ├── module/           # Audio modules
│   │   │   ├── dsp/              # DSP algorithms
│   │   │   └── lib.rs
│   │   ├── dsp/                  # TypeScript DSP layer
│   │   │   ├── ModuleDSPManager.ts
│   │   │   └── modules/          # Module wrappers
│   │   ├── pkg/                  # WASM output (generated)
│   │   ├── dist/                 # TypeScript output (generated)
│   │   ├── Cargo.toml            # Rust config
│   │   ├── package.json          # NPM config
│   │   └── tsconfig.json
│   │
│   └── ui/                        # @sobaka/ui
│       ├── src/
│       │   ├── modules/          # Module components
│       │   ├── components/       # Shared components
│       │   └── range/            # Range utilities
│       ├── .storybook/           # Storybook config
│       ├── package.json
│       └── vite.config.js
│
├── infrastructure/                 # 🏗️ Shared Infrastructure
│   ├── global/                    # Global AWS resources
│   ├── cdn.tf                     # CloudFront config
│   └── main.tf
│
├── package.json                    # Root workspace config
├── README.md                       # Project overview
├── MONOREPO.md                     # Monorepo documentation
└── MIGRATION_GUIDE.md             # Migration notes
```

## What Goes Where?

### 🚀 apps/

**Runnable applications** - Things you deploy or run locally.

- **apps/web** - User-facing web application
- **apps/signaling** - Backend service for WebRTC
- **apps/persistence** - Backend service for storage

**Characteristic**: Has a `main` entry point, intended to be run or deployed.

### 📦 packages/

**Reusable libraries** - Code that gets imported by apps.

- **packages/state** - State management logic
- **packages/dsp** - Audio processing
- **packages/ui** - UI components

**Characteristic**: Exported as packages, consumed by apps or other packages.

### 🏗️ infrastructure/

Terraform configurations for AWS deployment. Shared resources across all apps.

## Package vs App

| Aspect | Package | App |
|--------|---------|-----|
| Purpose | Reusable library | Runnable application |
| Exports | Modules/components | Nothing (has `main`) |
| Dependencies | Other packages | Packages + runtime |
| Build output | `dist/` for import | Deployable artifact |
| Examples | @sobaka/state | apps/web |

## Dependency Rules

### ✅ Allowed

- Apps can depend on packages
- Packages can depend on other packages (if ordered correctly)
- packages/ui can depend on packages/state
- packages/dsp can depend on packages/state
- apps/web can depend on all packages

### ❌ Not Allowed

- Packages cannot depend on apps
- Circular dependencies between packages
- packages/state cannot depend on packages/ui or packages/dsp

## Build Order

### Packages (dependency order)

1. **@sobaka/state** - No dependencies, builds first
2. **@sobaka/dsp** - Depends on state
3. **@sobaka/ui** - Depends on state
4. **apps/web** - Depends on all packages

### Rust Apps (independent)

- **apps/signaling** - Standalone, no package dependencies
- **apps/persistence** - Standalone, uses Yjs in Rust

Can build in any order or in parallel.

## Development Workflow

### Frontend Development

```bash
# 1. Build packages (first time or after changes)
npm run build:packages

# 2. Run web app
npm run dev:web

# 3. Develop UI in isolation (optional)
npm run storybook --workspace=packages/ui
```

### DSP Development

```bash
# Watch mode (debug WASM + TypeScript)
npm run dev --workspace=packages/dsp

# Then rebuild web app to see changes
npm run dev:web
```

### Full Stack Development

```bash
# Terminal 1: Web app
npm run dev:web

# Terminal 2: Signaling server
cd apps/signaling && cargo run

# Terminal 3: Persistence server (optional)
cd apps/persistence && cargo run
```

## Deployment

### Web App (Static Site)

```bash
cd apps/web
npm run build
# Deploy build/ to S3/CloudFront
```

### Signaling Server (Container)

```bash
cd apps/signaling
docker build -t sobaka-signaling .
docker push sobaka-signaling
# Deploy to ECS
```

### Persistence Server (Container)

```bash
cd apps/persistence
docker build -t sobaka-persistence .
docker push sobaka-persistence
# Deploy to ECS with EBS volume
```

## Adding New Code

### New UI Component

→ Add to `packages/ui/src/components/`
→ Create story in Storybook
→ Export from package

### New Module

→ Rust: `packages/dsp/src/module/`
→ TypeScript: `packages/dsp/dsp/modules/`
→ UI: `packages/ui/src/modules/`
→ Register in `packages/ui/src/modules/index.ts`

### New State Model

→ Add to `packages/state/src/models/`
→ Export from `packages/state/src/index.ts`

### New App

→ Create in `apps/my-app/`
→ Add to root workspace if npm package
→ Add README explaining purpose

## Key Files

| File | Purpose |
|------|---------|
| `/package.json` | Root workspace config |
| `/apps/web/package.json` | Web app dependencies |
| `/packages/*/package.json` | Package configurations |
| `/apps/web/infrastructure/` | Web app deployment |
| `/apps/signaling/infrastructure/` | Signaling deployment |
| `/apps/persistence/infrastructure/` | Persistence deployment |
| `/infrastructure/` | Shared AWS resources |

## Quick Reference

```bash
# Development
npm run dev                              # Run web app
npm run storybook -w packages/ui        # UI component development
npm run dev -w packages/dsp             # DSP development

# Building
npm run build                            # Build everything
npm run build:packages                   # Just packages
npm run build:web                        # Just web app

# Testing
npm test                                 # All tests
npm test -w packages/state              # Specific package

# Servers (from app directories)
cd apps/signaling && cargo run          # Signaling
cd apps/persistence && cargo run        # Persistence

# Cleanup
npm run clean                            # Remove node_modules and dist
```

## Notes

- **apps/web** is an npm workspace (uses packages as dependencies)
- **apps/signaling** and **apps/persistence** are standalone Rust projects
- All packages use TypeScript (except dsp which is Rust + TypeScript)
- Infrastructure is split per-app for independent deployment
