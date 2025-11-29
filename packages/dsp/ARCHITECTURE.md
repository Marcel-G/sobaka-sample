# @sobaka/dsp Architecture

This package combines Rust-based WASM audio worklets with TypeScript DSP management into a single cohesive package.

## Two-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  TypeScript Layer                        │
│              (dsp/ directory)                            │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  ModuleDSPManager                              │    │
│  │  - Orchestrates module lifecycle               │    │
│  │  - Observes state changes                      │    │
│  │  - Creates/destroys WASM instances             │    │
│  │  - Provides plug contexts for routing          │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Module DSP Classes (ClockDSP, OscillatorDSP)  │    │
│  │  - Wrap WASM modules                           │    │
│  │  - Handle parameter updates                    │    │
│  │  - Manage audio connections                    │    │
│  └────────────────────────────────────────────────┘    │
│                         ↓                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    WASM Layer                            │
│               (src/ directory - Rust)                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Audio Worklet Modules                         │    │
│  │  - Oscillator, Filter, Envelope, etc.          │    │
│  │  - Run in separate audio thread                │    │
│  │  - Near-native performance                     │    │
│  │  - Process audio samples                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Built with:                                             │
│  - waw (WebAssembly Audio Worklet framework)            │
│  - fundsp (DSP algorithms)                              │
│  - wasm-bindgen (Rust ↔ JS bindings)                   │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
packages/dsp/
├── src/                    # Rust source code
│   ├── lib.rs             # WASM entry point
│   ├── module/            # Audio worklet modules
│   │   ├── oscillator.rs
│   │   ├── filter.rs
│   │   ├── envelope.rs
│   │   └── ...
│   ├── dsp/               # DSP algorithms
│   │   ├── oscillator.rs
│   │   ├── quantiser.rs
│   │   └── ...
│   └── utils/
│
├── dsp/                    # TypeScript DSP layer
│   ├── ModuleDSPManager.ts
│   ├── types.ts
│   ├── index.ts
│   └── modules/           # Module wrappers
│       ├── ClockDSP.ts
│       ├── OscillatorDSP.ts
│       └── ...
│
├── pkg/                    # WASM build output (generated)
│   ├── sobaka_dsp.js
│   ├── sobaka_dsp.d.ts
│   └── sobaka_dsp_bg.wasm
│
├── dist/                   # TypeScript build output (generated)
│   ├── index.js
│   ├── index.d.ts
│   └── ...
│
├── Cargo.toml             # Rust package config
├── package.json           # NPM package config
└── tsconfig.json          # TypeScript config
```

## Build Process

### 1. Rust → WASM (wasm-pack)

```bash
npm run build:wasm
```

**Input**: `src/**/*.rs`  
**Output**: `pkg/sobaka_dsp.{js,d.ts,wasm}`

This compiles Rust code to WebAssembly using wasm-pack:
- Generates JavaScript bindings
- Creates TypeScript type definitions
- Optimizes WASM for web

### 2. TypeScript → JavaScript (tsc)

```bash
npm run build:ts
```

**Input**: `dsp/**/*.ts`  
**Output**: `dist/**/*.{js,d.ts}`

This compiles the TypeScript DSP management layer:
- Uses the WASM types from `pkg/`
- Imports from `@sobaka/state`
- Generates CommonJS modules

### 3. Full Build

```bash
npm run build
```

Runs both steps in sequence:
1. WASM compilation
2. TypeScript compilation

## How It Works

### Rust Side (Audio Thread)

Each module in `src/module/` is an AudioWorklet processor:

```rust
// src/module/oscillator.rs
#[wasm_bindgen]
pub struct Oscillator {
    processor: AudioWorkletProcessor,
    // ... fields
}

#[wasm_bindgen]
impl Oscillator {
    pub async fn create(context: &AudioContext) -> Result<Oscillator, JsValue> {
        // Create audio worklet
    }
    
    pub fn command(&self, command: OscillatorCommand) {
        // Update parameters
    }
    
    pub fn get_param(&self, name: &str) -> AudioParam {
        // Get parameter for CV control
    }
}
```

These compile to WASM and run in a separate audio thread.

### TypeScript Side (Main Thread)

Each `*DSP.ts` file wraps a WASM module:

```typescript
// dsp/modules/OscillatorDSP.ts
import { Oscillator } from '../../../pkg/sobaka_dsp'

export class OscillatorDSP implements ModuleDSP {
  private oscillator: Oscillator
  
  constructor(id: string, audioContext: AudioContext, state: State) {
    // Create WASM instance
    this.oscillator = await Oscillator.create(audioContext)
  }
  
  updateState(state: Record<string, unknown>): void {
    // Send commands to WASM
    this.oscillator.command({ SetShape: state.shape })
  }
}
```

### Manager Orchestration

`ModuleDSPManager` ties everything together:

1. **Observes state changes** from `@sobaka/state`
2. **Creates DSP instances** using factories
3. **Updates parameters** reactively
4. **Manages lifecycle** (create/destroy)
5. **Provides plug contexts** for audio routing

## Communication Flow

```
User Action (UI)
    ↓
State Update (Yjs)
    ↓
ModuleDSPManager detects change
    ↓
Module DSP Class (OscillatorDSP)
    ↓
WASM Binding (sobaka_dsp.js)
    ↓
Audio Worklet (Rust WASM)
    ↓
Audio Output
```

## Performance Characteristics

### WASM Layer
- **Runs in**: AudioWorklet (separate thread)
- **Language**: Rust (compiled to WASM)
- **Performance**: Near-native speed
- **Latency**: Real-time audio processing
- **Memory**: Allocated in WASM linear memory

### TypeScript Layer
- **Runs in**: Main thread
- **Language**: TypeScript/JavaScript
- **Performance**: Standard JS performance
- **Purpose**: Parameter management, not audio processing
- **Updates**: Async messages to audio thread

## Development Workflow

### Modify Rust Code

```bash
# Edit src/module/oscillator.rs
# Rebuild WASM
npm run build:wasm:debug

# TypeScript will see updated types automatically
```

### Modify TypeScript Code

```bash
# Edit dsp/modules/OscillatorDSP.ts
# Watch mode for fast iteration
npm run dev:ts
```

### Full Development Mode

```bash
npm run dev
```

Builds debug WASM once, then watches TypeScript files.

## Benefits of Integrated Package

1. **Single Source of Truth**: WASM and TypeScript stay in sync
2. **Type Safety**: TypeScript uses WASM-generated types
3. **Simpler Builds**: One package to build instead of two
4. **Better DX**: Changes to Rust automatically flow to TypeScript
5. **Version Alignment**: No version mismatch between layers

## Adding a New Module

### 1. Create Rust Module

```rust
// src/module/new_module.rs
#[wasm_bindgen]
pub struct NewModule {
    // ...
}

#[wasm_bindgen]
impl NewModule {
    pub async fn create(ctx: &AudioContext) -> Result<NewModule, JsValue> {
        // ...
    }
}
```

### 2. Create TypeScript Wrapper

```typescript
// dsp/modules/NewModuleDSP.ts
import { NewModule } from '../../../pkg/sobaka_dsp'

export class NewModuleDSP implements ModuleDSP {
    // Wrap WASM module
}

registerDSPFactory('NewModule', createNewModuleDSP)
```

### 3. Export in Index

```typescript
// dsp/index.ts
export * from './modules/NewModuleDSP'
```

### 4. Build

```bash
npm run build
```

WASM types automatically available to TypeScript!

## Testing

### Rust Tests

```bash
npm run test:rust
# or
cargo test
```

### TypeScript Tests

```bash
npm run test
```

## Deployment

The package exports both layers:

```typescript
// Use DSP manager (recommended)
import { ModuleDSPManager } from '@sobaka/dsp'

// Or use WASM directly
import { Oscillator } from '@sobaka/dsp/wasm'
```

Both are compiled and optimized for production.
