# Monorepo Migration Guide

This guide explains how to complete the migration to the monorepo structure.

## Current Status

✅ **Completed**:
- Created monorepo structure with npm workspaces
- Created `@sobaka/state` package
- Created `@sobaka/dsp` package  
- Created `@sobaka/ui` package with Storybook
- Copied files to appropriate packages
- Set up Storybook for UI development

⚠️ **TODO**:
- Fix import paths in all packages
- Remove duplicate files from original `frontend/`
- Test build process
- Update CI/CD if applicable

## Package Structure

```
packages/
├── state/          # @sobaka/state - Yjs models, state management
├── dsp/            # @sobaka/dsp - Audio processing
├── ui/             # @sobaka/ui - UI components (with Storybook)
└── app/            # @sobaka/app - Main SvelteKit app
```

## Step-by-Step Migration

### Step 1: Fix Imports in @sobaka/state

The state package should have no UI dependencies. Update imports:

**Before**:
```typescript
import { INITIAL_STATE, type ModuleUI } from '../modules'
```

**After**:
```typescript
// Remove UI dependencies, just use types
export type ModuleUI = string
export type ModuleState = Record<string, unknown>
```

Files to update:
- `packages/state/src/models/workspace.ts`
- Remove references to `../modules`

### Step 2: Fix Imports in @sobaka/dsp

Update imports to use `@sobaka/state`:

**Before**:
```typescript
import type { Module } from '../models/workspace'
import { createPlugId, PlugType } from '../models/links'
import type { NodeContext, ParamContext } from '../context/plugs'
```

**After**:
```typescript
import type { Module, PlugType, NodeContext, ParamContext } from '@sobaka/state'
```

Files to update:
- `packages/dsp/src/dsp/ModuleDSPManager.ts`
- All files in `packages/dsp/src/dsp/modules/`

### Step 3: Fix Imports in @sobaka/ui

Update imports to use workspace packages:

**Before**:
```typescript
import { get_workspace } from '../../context/workspace'
import { PlugType } from '../../models/links'
```

**After**:
```typescript
import { get_workspace } from './context/workspace' // Keep local
import { PlugType } from '@sobaka/state'
```

Files to update:
- All module components in `packages/ui/src/modules/`
- All components in `packages/ui/src/components/`

### Step 4: Fix Imports in @sobaka/app

Update imports to use workspace packages:

**Before**:
```typescript
import { Workspace } from '../models/workspace'
import { ModuleDSPManager } from '../dsp'
import Clock from '../modules/Clock.svelte'
```

**After**:
```typescript
import { Workspace } from '@sobaka/state'
import { ModuleDSPManager } from '@sobaka/dsp'
import Clock from '@sobaka/ui/modules/Clock.svelte'
```

Files to update:
- All files in `packages/app/src/`

### Step 5: Remove Duplicates

Once imports are fixed and tested:

```bash
# Remove old frontend directory (keeping infrastructure)
rm -rf frontend/src
rm -rf frontend/node_modules

# Keep frontend/infrastructure for deployment config
```

### Step 6: Update Root Scripts

The root `package.json` is already set up with workspace commands:

```bash
# Development
npm run dev                    # Runs @sobaka/app dev server

# Build all packages
npm run build                  # Builds all packages in order

# UI development
npm run storybook --workspace=@sobaka/ui

# Clean
npm run clean                  # Remove all node_modules and dist
```

### Step 7: Install Dependencies

```bash
# From root directory
npm install

# This will install all packages and link workspace dependencies
```

### Step 8: Build Order

Packages must be built in dependency order:

1. `@sobaka/state` (no dependencies)
2. `@sobaka/dsp` (depends on state)
3. `@sobaka/ui` (depends on state)
4. `@sobaka/app` (depends on all)

The root `npm run build` handles this automatically.

## Testing the Migration

### 1. Test State Package

```bash
cd packages/state
npm run build
```

Should compile without errors.

### 2. Test DSP Package

```bash
cd packages/dsp
npm run build
```

Should compile and resolve `@sobaka/state` imports.

### 3. Test UI Package with Storybook

```bash
cd packages/ui
npm run storybook
```

Should open Storybook at http://localhost:6006

### 4. Test Main App

```bash
cd packages/app
npm run dev
```

Should start the SvelteKit dev server.

## Common Import Patterns

### Importing from @sobaka/state

```typescript
// Models
import { Workspace, WorkspaceList, Root } from '@sobaka/state'

// Types
import type { Module, Link, PlugType } from '@sobaka/state'

// RTC
import { VerifiedRTCProvider } from '@sobaka/state'
```

### Importing from @sobaka/dsp

```typescript
// Manager
import { ModuleDSPManager } from '@sobaka/dsp'

// Types
import type { ModuleDSP, ModuleDSPFactory } from '@sobaka/dsp'

// Registration (in app entry point)
import '@sobaka/dsp' // Registers all factories
```

### Importing from @sobaka/ui

```typescript
// Module components
import Clock from '@sobaka/ui/modules/Clock.svelte'
import Oscillator from '@sobaka/ui/modules/Oscillator/Oscillator.svelte'

// Shared components
import Knob from '@sobaka/ui/components/Knob/Knob.svelte'
import Panel from '@sobaka/ui/components/Panel.svelte'

// Range utilities
import { create_bpm_range, create_scale_range } from '@sobaka/ui/range'
```

## Troubleshooting

### "Cannot find module '@sobaka/state'"

Run `npm install` from root to link workspace dependencies.

### "Type errors across packages"

Ensure all packages are built:
```bash
npm run build --workspace=@sobaka/state
npm run build --workspace=@sobaka/dsp
```

### Circular dependencies

Check import paths. State should not import from UI or DSP.

### Storybook not finding components

Ensure `@sobaka/ui/src/app.css` is imported in `.storybook/preview.ts`

## Benefits After Migration

1. **Isolated Development**: Work on UI components in Storybook without running the full app
2. **Faster Builds**: Only rebuild changed packages
3. **Better Testing**: Test state and DSP logic independently
4. **Type Safety**: TypeScript enforces package boundaries
5. **Reusability**: Packages can be published/reused independently

## Next Steps

After migration is complete:

1. Set up automated testing per package
2. Add Chromatic for visual regression testing
3. Consider publishing packages to npm (if useful for other projects)
4. Add package-specific documentation
5. Set up pre-commit hooks for each package
