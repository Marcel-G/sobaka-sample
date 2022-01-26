## Setup

Install `wasm-pack`
Install cargo watch `cargo install cargo-watch`

check back on wasm-pack serve https://github.com/rustwasm/wasm-pack/pull/745

## Usage

```ts
import sobaka_sample_wasm_url from 'sobaka-sample-audio-worklet/wasm'
import sobaka_sample_worklet_url from 'sobaka-sample-audio-worklet/worklet'
import { SobakaContext, Oscillator, Sink } from 'sobaka-sample-audio-worklet'


const audioContext = new AudioContext()
const context = await SobakaContext.register(
	sobaka_sample_wasm_url,
	sobaka_sample_worklet_url,
	audioContext
)

// Connect SobakaAudio to WebAudio context
context.connect(audioContext.destination)

// Create SobakaAudio modules
const oscillator = new Oscillator(context, { wave: Oscillator.wave.Sine })
const sink = new Sink(context)

// Link SobakaAudio modules together
context.link(
	oscillator,
	sink,
	Sink.Inputs.Signal
)

```