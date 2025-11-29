# Frontend Architecture

## Overview

This application follows a three-layer architecture that separates State, DSP (Digital Signal Processing), and View concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                      State Layer                             │
│                   (Yjs Models)                               │
│           Single Source of Truth                            │
│         modules: Array<Module>                              │
│         links: Array<Link>                                  │
└──────────────┬────────────────────────────────┬─────────────┘
               │                                │
               │ observes                       │ observes
               ▼                                ▼
┌──────────────────────────────┐  ┌───────────────────────────┐
│        DSP Layer             │  │      View Layer           │
│   (src/dsp/)                 │  │   (src/modules/)          │
│                              │  │                           │
│  - ModuleDSPManager          │  │  - Svelte Components      │
│  - Module DSP Classes        │  │  - UI Rendering           │
│  - Audio Node Management     │  │  - State Binding          │
│  - Parameter Updates         │  │  - User Interaction       │
│  - Plug Context Registry     │  │                           │
│  - Reactive to State         │  │  - No DSP Logic           │
└──────────────────────────────┘  └───────────────────────────┘
```

## State Layer (`src/models/`)

**Responsibility**: Single source of truth for all application state

- **Technology**: Yjs (CRDT-based collaborative data structures)
- **Key Files**:
  - `workspace.ts` - Main workspace model containing modules and links
  - `links.ts` - Audio routing/connection definitions
  - `root.ts` - Top-level document model

**What it stores**:
- Module instances with their state (bpm, frequency, gain, etc.)
- Audio routing (links between module plugs)
- Workspace metadata (title, owner, collaborators)

**What it doesn't do**:
- Create or manage audio nodes
- Update AudioParams directly
- Render UI components

## DSP Layer (`src/dsp/`)

**Responsibility**: Audio processing, reactive to state changes

- **Entry Point**: `ModuleDSPManager` orchestrates all DSP instances
- **Module Pattern**: Each module type has a corresponding DSP class

### Key Components

#### `ModuleDSPManager.ts`
Central orchestrator that:
- Subscribes to workspace modules (Yjs store)
- Creates/destroys DSP instances as modules are added/removed
- Updates DSP parameters when module state changes
- Provides plug contexts for audio routing

#### Module DSP Classes (`src/dsp/modules/`)
Each implements the `ModuleDSP` interface:

```typescript
interface ModuleDSP {
  readonly id: string
  updateState(state: Record<string, unknown>): void
  getPlugContexts(): Record<string, ParamContext | NodeContext>
  destroy(): void
}
```

**Examples**:
- `ClockDSP.ts` - Manages ClockDividerNode from sobaka-dsp
- `OscillatorDSP.ts` - Manages WASM Oscillator with shape/pitch
- `FilterDSP.ts` - Manages multi-mode filter
- `VcaDSP.ts` - Manages native GainNode

### Factory Registration

DSP modules self-register on import:

```typescript
registerDSPFactory('Clock', createClockDSP)
```

The DSP layer is initialized early in `+layout.svelte`:

```typescript
import '../dsp'  // Registers all factories
```

### Reactive State Updates

When module state changes in Yjs:
1. ModuleDSPManager detects the change
2. Calls `updateState()` on the corresponding DSP instance
3. DSP instance updates AudioParam values at current audio time

## View Layer (`src/modules/`)

**Responsibility**: UI rendering and user interaction only

- **Technology**: Svelte components
- **Pattern**: Presentational components with two-way state binding

### What View Components Do

✅ **Render UI**
- Knobs, switches, buttons
- Visual feedback (LEDs, graphs)
- Panel layout

✅ **Bind to State**
```svelte
<Knob bind:value={state.bpm} range={bpm_range} label="bpm" />
```

✅ **Handle User Input**
- Click events
- Drag interactions
- Keyboard shortcuts

### What View Components Don't Do

❌ **No Audio Node Creation**
```svelte
// OLD (bad):
onMount(() => {
  oscillator = new OscillatorNode(audioContext)
  oscillator.start()
})

// NEW (good):
// Nothing - DSP layer handles this
```

❌ **No Parameter Updates**
```svelte
// OLD (bad):
$: frequency_param?.setValueAtTime(state.frequency, audioContext.currentTime)

// NEW (good):
// Nothing - DSP layer reacts to state changes
```

❌ **No Lifecycle Management**
```svelte
// OLD (bad):
onDestroy(() => {
  oscillator?.destroy()
  oscillator?.free()
})

// NEW (good):
// Nothing - DSP layer manages lifecycle
```

### Plug Components

Plugs now only need to specify their type:

```svelte
<Plug id={0} label="output" ctx={{ type: PlugType.Output }} />
```

The actual audio node context comes from the DSP layer automatically.

## Benefits of This Architecture

### 1. **Separation of Concerns**
- State management is independent of audio processing
- UI rendering is independent of both
- Each layer has a single, clear responsibility

### 2. **Scalability**
- Easy to add new module types
- DSP logic is isolated and testable
- View components are simple and focused

### 3. **Maintainability**
- Clear data flow: State → DSP & State → View
- No circular dependencies
- Easy to reason about system behavior

### 4. **Collaborative Features**
- State layer (Yjs) handles real-time collaboration
- DSP and View layers just react to state changes
- No special handling needed for remote updates

### 5. **Testing**
- DSP layer can be unit tested without UI
- View layer can be tested with mock state
- State layer can be tested independently

## Adding a New Module

### 1. Create DSP Class

```typescript
// src/dsp/modules/MyModuleDSP.ts
export class MyModuleDSP implements ModuleDSP {
  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: MyModuleState
  ) {
    // Create audio nodes
  }

  updateState(state: Record<string, unknown>): void {
    // Update audio parameters
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    // Return plug contexts for routing
  }

  destroy(): void {
    // Clean up audio nodes
  }
}

const createMyModuleDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  return new MyModuleDSP(id, audioContext, initialState)
}

registerDSPFactory('MyModule', createMyModuleDSP)
```

### 2. Create View Component

```svelte
<!-- src/modules/MyModule.svelte -->
<script context="module" lang="ts">
  type State = { param: number }
  export const initialState: State = { param: 0.5 }
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  
  export let state: State
  export let disabled = false
</script>

<Panel name="my_module" {disabled} height={6} width={5}>
  <Knob bind:value={state.param} label="parameter" />
  
  <div slot="outputs">
    <Plug id={0} {disabled} label="output" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
```

### 3. Register Module

```typescript
// src/modules/index.ts
import MyModule, { initialState as myModuleInitialState } from './MyModule.svelte'

export const MODULES = {
  // ...
  MyModule
}

export const INITIAL_STATE = {
  // ...
  MyModule: myModuleInitialState
}
```

### 4. Import DSP Factory

```typescript
// src/dsp/index.ts
import './modules/MyModuleDSP'
```

That's it! The module will automatically:
- Be available in the toolbox
- Create DSP instances when added to workspace
- React to state changes
- Clean up on removal

## Migration Notes

This architecture was introduced in a refactoring to separate concerns that were previously mixed in view components. The key insight was:

**Before**: DSP → View → State (view layer as intermediary)
**After**: DSP → State ← View (state as single source of truth)

Some modules (Sequencer, StepSequencer, Scope, SpecScope) require event subscriptions for visual feedback and are not yet migrated. These can be added by extending the DSP layer with an event system if needed.
