import Clock, { initialState as clockInitialState } from './Clock.svelte'
import Envelope, {
  initialState as envelopeInitialState
} from './Envelope/Envelope.svelte'
import Filter, { initialState as filterInitialState } from './Filter.svelte'
import Oscillator, { initialState as oscillatorInitialState } from './Oscillator.svelte'
import Parameter, { initialState as ParameterInitialState } from './Parameter.svelte'
import Reverb, { initialState as reverbInitialState } from './Reverb.svelte'
import Sequencer, { initialState as sequencerInitialState } from './Sequencer.svelte'
import StepSequencer, {
  initialState as stepSequencerInitialState
} from './StepSequencer.svelte'
import Output, { initialState as outputInitialState } from './Output.svelte'
import Vca, { initialState as vcaInitialState } from './Vca.svelte'
import Noise, { initialState as noiseInitialState } from './Noise.svelte'
import Delay, { initialState as delayInitialState } from './Delay.svelte'
import Scope, { initialState as scopeInitialState } from './Scope/Scope.svelte'
import Midi, { initialState as midiInitialState } from './Midi.svelte'
import Lfo, { initialState as lfoInitialState } from './Lfo.svelte'
import Quantiser, { initialState as quantiserInitialState } from './Quantiser.svelte'
import SampleAndHold, {
  initialState as sampleAndHoldInitialState
} from './SampleAndHold.svelte'
import Sampler, { initialState as samplerInitialState } from './Sampler/Sampler.svelte'
import { Module } from '../models/WorkspaceStore'

export const MODULES = {
  Clock,
  Envelope,
  Filter,
  Oscillator,
  Parameter,
  Reverb,
  Sequencer,
  StepSequencer,
  Output,
  Vca,
  Noise,
  Delay,
  Scope,
  Midi,
  Lfo,
  Quantiser,
  SampleAndHold,
  Sampler
} as const

export type ModuleUI = keyof typeof MODULES

// TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export const INITIAL_STATE = {
  Clock: clockInitialState,
  Envelope: envelopeInitialState,
  Filter: filterInitialState,
  Oscillator: oscillatorInitialState,
  Parameter: ParameterInitialState,
  Reverb: reverbInitialState,
  Sequencer: sequencerInitialState,
  StepSequencer: stepSequencerInitialState,
  Output: outputInitialState,
  Vca: vcaInitialState,
  Noise: noiseInitialState,
  Delay: delayInitialState,
  Scope: scopeInitialState,
  Midi: midiInitialState,
  Lfo: lfoInitialState,
  Quantiser: quantiserInitialState,
  SampleAndHold: sampleAndHoldInitialState,
  Sampler: samplerInitialState
} as const
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

// Maybe it's better to use props somehow?
// https://github.com/sveltejs/language-tools/issues/442#issuecomment-1145948441
// type Props = Clock['$$prop_def']['pricing']

export const get_component = (module: Module) => {
  return MODULES[module.type]
}
