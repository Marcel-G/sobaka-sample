# @sobaka/dsp

Audio processing layer combining Rust/WASM audio worklets with TypeScript DSP management.

## Structure

```
packages/dsp/
├── src/               # Rust source (WASM audio worklets)
│   ├── lib.rs
│   ├── module/        # Audio modules (oscillator, filter, etc.)
│   ├── dsp/           # DSP algorithms
│   └── utils/
├── dsp/               # TypeScript DSP layer
│   ├── ModuleDSPManager.ts
│   ├── types.ts
│   └── modules/       # Module DSP classes
├── pkg/               # Generated WASM output (from wasm-pack)
└── dist/              # Generated TypeScript output

```

## Build Pipeline

```
Rust Source (src/) 
    ↓ [wasm-pack]
WASM Output (pkg/)
    ↓
TypeScript DSP (dsp/)
    ↓ [tsc]
Compiled JS (dist/)
```

## Development

### Prerequisites

- Rust toolchain (rustup)
- wasm-pack: `cargo install wasm-pack`
- Node.js 18+

### Build WASM

```bash
# Production build
npm run build:wasm

# Debug build (faster, larger)
npm run build:wasm:debug
```

Output: `pkg/sobaka_dsp.js` and `pkg/sobaka_dsp_bg.wasm`

### Build TypeScript

```bash
# Build once
npm run build:ts

# Watch mode
npm run dev:ts
```

Output: `dist/` directory

### Full Build

```bash
# Build WASM + TypeScript
npm run build

# Development mode (debug WASM + watch TS)
npm run dev
```

## Rust Modules

The Rust code compiles to WebAssembly audio worklets:

- **Oscillator**: Multi-shape oscillator with volt/octave
- **Filter**: Multi-mode filter (lowpass, highpass, bandpass, moog)
- **Envelope**: ADSR envelope generator
- **Delay**: Digital delay line
- **Reverb**: Reverb effect
- **Noise**: White noise generator
- **Quantiser**: Pitch quantizer
- **SampleAndHold**: Sample and hold
- **Clock**: Clock divider with multiple outputs

Each module runs in an AudioWorklet for real-time performance.

## TypeScript DSP Layer

The TypeScript layer manages the WASM modules:

### ModuleDSPManager

Orchestrates module lifecycle:
- Creates WASM instances when modules added to state
- Updates parameters reactively
- Provides plug contexts for audio routing
- Cleans up on module removal

### Module DSP Classes

Each module type has a DSP class (e.g., `OscillatorDSP`, `FilterDSP`) that:
- Wraps the WASM module
- Implements the `ModuleDSP` interface
- Handles state updates
- Manages audio connections

## Usage

```typescript
import { ModuleDSPManager } from '@sobaka/dsp'
import { Workspace } from '@sobaka/state'

// In your app
const dspManager = new ModuleDSPManager(audioContext, workspace.modules)

// DSP manager automatically:
// - Creates WASM instances for each module
// - Updates parameters when state changes
// - Provides plug contexts for routing
```

## Importing WASM Directly

If you need direct access to WASM modules:

```typescript
import { Oscillator, Filter } from '@sobaka/dsp/wasm'

// Create instances manually
const osc = await Oscillator.create(audioContext)
osc.command({ SetShape: 'Sine' })
```

## Testing

```bash
# Test Rust code
npm run test:rust

# Test TypeScript (TODO)
npm run test
```

## Performance

- WASM modules run in AudioWorklets (separate thread)
- Near-native performance for DSP algorithms
- Main thread only handles parameter updates
- Audio processing happens off main thread

## Building for Production

```bash
npm run build
```

This:
1. Compiles Rust to optimized WASM
2. Compiles TypeScript to JavaScript
3. Outputs to `pkg/` and `dist/`

## Dependencies

### Rust
- `waw` - WebAssembly audio worklet framework
- `fundsp` - DSP algorithms
- `wasm-bindgen` - Rust ↔ JavaScript bindings

### TypeScript
- `@sobaka/state` - State models and types
- Svelte (peer dependency)

## Notes

- WASM compilation requires ~30s for production builds
- Debug builds are faster but larger (~2-3x size)
- Use `npm run dev` for development (debug WASM + watch mode)
- The `pkg/` directory is generated - don't edit manually
