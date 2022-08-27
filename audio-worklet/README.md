## Setup

Install `wasm-pack`
Install cargo watch `cargo install cargo-watch`

check back on wasm-pack serve https://github.com/rustwasm/wasm-pack/pull/745

## Usage

```ts
import { SobakaContext, Oscillator, Output } from 'sobaka-sample-audio-worklet'

const audioContext = new AudioContext()
const context = await SobakaContext.register(audioContext)

// Connect SobakaAudio to WebAudio context
context.connect(audioContext.destination)

// Create SobakaAudio modules
const oscillator = new Oscillator(context, { wave: Oscillator.wave.Sine })
const output = new Output(context)

// Link SobakaAudio modules together
context.link(oscillator, output, output.Inputs.Signal)
```
