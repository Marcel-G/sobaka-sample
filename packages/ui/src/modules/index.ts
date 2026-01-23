/**
 * UI Modules Package
 * 
 * Exports Svelte components for each module type.
 * App pairs these with DSP nodes via PluginRegistry.
 */

// Types
export type { ModuleComponent, BaseModuleProps } from '../types/props'

// Module components - import these to register with PluginRegistry
export { default as Clock } from './Clock.svelte'
export { default as Oscillator } from './Oscillator/Oscillator.svelte'
export { default as Noise } from './Noise.svelte'
export { default as Filter } from './Filter.svelte'
export { default as Envelope } from './Envelope/Envelope.svelte'
export { default as Delay } from './Delay.svelte'
export { default as Reverb } from './Reverb.svelte'
export { default as Quantiser } from './Quantiser.svelte'
export { default as Parameter } from './Parameter.svelte'
export { default as Vca } from './Vca.svelte'
export { default as Scope } from './Scope/Scope.svelte'
export { default as Lfo } from './Lfo/Lfo.svelte'
export { default as Euclidean } from './Euclidean/Euclidean.svelte'
export { default as Mixer } from './Mixer.svelte'
