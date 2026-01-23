/**
 * UI component definitions for all modules
 * App imports these and registers the ones it needs
 */

import type { UIModuleDefinition } from './registry'

// Import all module components
import Clock from './Clock.svelte'
import Oscillator from './Oscillator/Oscillator.svelte'
import Noise from './Noise.svelte'
import Filter from './Filter.svelte'
import Envelope from './Envelope/Envelope.svelte'
import Delay from './Delay.svelte'
import Reverb from './Reverb.svelte'
import Quantiser from './Quantiser.svelte'
import Parameter from './Parameter.svelte'
import Vca from './Vca.svelte'
import Scope from './Scope/Scope.svelte'
import Lfo from './Lfo/Lfo.svelte'
import Euclidean from './Euclidean/Euclidean.svelte'

// Individual definitions
export const ClockUI: UIModuleDefinition = { type: 'Clock', component: Clock }
export const OscillatorUI: UIModuleDefinition = { type: 'Oscillator', component: Oscillator }
export const NoiseUI: UIModuleDefinition = { type: 'Noise', component: Noise }
export const FilterUI: UIModuleDefinition = { type: 'Filter', component: Filter }
export const EnvelopeUI: UIModuleDefinition = { type: 'Envelope', component: Envelope }
export const DelayUI: UIModuleDefinition = { type: 'Delay', component: Delay }
export const ReverbUI: UIModuleDefinition = { type: 'Reverb', component: Reverb }
export const QuantiserUI: UIModuleDefinition = { type: 'Quantiser', component: Quantiser }
export const ParameterUI: UIModuleDefinition = { type: 'Parameter', component: Parameter }
export const VcaUI: UIModuleDefinition = { type: 'Vca', component: Vca }
export const ScopeUI: UIModuleDefinition = { type: 'Scope', component: Scope }
export const LfoUI: UIModuleDefinition = { type: 'Lfo', component: Lfo }
export const EuclideanUI: UIModuleDefinition = { type: 'Euclidean', component: Euclidean }

/**
 * All available UI component definitions
 * App can register all or pick specific ones
 */
export const allUIDefinitions: UIModuleDefinition[] = [
  ClockUI,
  OscillatorUI,
  NoiseUI,
  FilterUI,
  EnvelopeUI,
  DelayUI,
  ReverbUI,
  QuantiserUI,
  ParameterUI,
  VcaUI,
  ScopeUI,
  LfoUI,
  EuclideanUI,
]

// Re-export components for direct import if needed
export {
  Clock,
  Oscillator,
  Noise,
  Filter,
  Envelope,
  Delay,
  Reverb,
  Quantiser,
  Parameter,
  Vca,
  Scope,
  Lfo,
  Euclidean,
}
