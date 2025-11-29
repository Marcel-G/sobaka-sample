import Clock, { initialState as clockInitialState } from './Clock.svelte'
import Envelope, {
  initialState as envelopeInitialState
} from './Envelope/Envelope.svelte'
import Filter, { initialState as filterInitialState } from './Filter.svelte'
import Oscillator, {
  initialState as oscillatorInitialState
} from './Oscillator/Oscillator.svelte'
import Parameter, { initialState as parameterInitialState } from './Parameter.svelte'
import Reverb, { initialState as reverbInitialState } from './Reverb.svelte'
// TODO: Sequencer, StepSequencer, Scope, SpecScope need DSP implementations with event subscriptions
// import Sequencer, { initialState as sequencerInitialState } from './Sequencer.svelte'
// import StepSequencer, {
//   initialState as stepSequencerInitialState
// } from './StepSequencer.svelte'
import Vca, { initialState as vcaInitialState } from './Vca.svelte'
import Noise, { initialState as noiseInitialState } from './Noise.svelte'
import Delay, { initialState as delayInitialState } from './Delay.svelte'
// import Scope, { initialState as scopeInitialState } from './Scope/Scope.svelte'
// import SpecScope, { initialState as specScopeInitialState } from './SpecScope.svelte'
import Lfo, { initialState as lfoInitialState } from './Lfo.svelte'
import Quantiser, { initialState as quantiserInitialState } from './Quantiser.svelte'
import SampleAndHold, {
  initialState as sampleAndHoldInitialState
} from './SampleAndHold.svelte'
import type { Module } from '../models/workspace'

export const MODULES = {
  Clock,
  Envelope,
  Filter,
  Oscillator,
  Parameter,
  Reverb,
  // Sequencer,
  // StepSequencer,
  Vca,
  Noise,
  Delay,
  // Scope,
  // SpecScope,
  Lfo,
  Quantiser,
  SampleAndHold
} as const

export type ModuleUI = keyof typeof MODULES

// TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817

export const INITIAL_STATE = {
  Clock: clockInitialState,
  Envelope: envelopeInitialState,
  Filter: filterInitialState,
  Oscillator: oscillatorInitialState,
  Parameter: parameterInitialState,
  Reverb: reverbInitialState,
  // Sequencer: sequencerInitialState,
  // StepSequencer: stepSequencerInitialState,
  Vca: vcaInitialState,
  Noise: noiseInitialState,
  Delay: delayInitialState,
  // Scope: scopeInitialState,
  // SpecScope: specScopeInitialState,
  Lfo: lfoInitialState,
  Quantiser: quantiserInitialState,
  SampleAndHold: sampleAndHoldInitialState
} as const

// Maybe it's better to use props somehow?
// https://github.com/sveltejs/language-tools/issues/442#issuecomment-1145948441
// type Props = Clock['$$prop_def']['pricing']

export const get_component = (module: Module) => {
  return MODULES[module.type]
}
