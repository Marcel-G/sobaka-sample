import { Module } from '../state/modules'

import Clock from './Clock.svelte'
import Envelope from './Envelope.svelte'
import Filter from './Filter.svelte'
import Oscillator from './Oscillator.svelte'
import Parameter from './Parameter.svelte'
import Reverb from './Reverb.svelte'
import Sequencer from './Sequencer.svelte'
import Output from './Output.svelte'
import Vca from './Vca.svelte'
import Noise from './Noise.svelte'
import Delay from './Delay.svelte'
import Scope from './Scope.svelte'
import String from './String.svelte'
import Lfo from './Lfo.svelte'

/**
 * Modules that can be spawned on the frontend.
 * These can be made up of several SobakaNodeTypes.
 * Core modules map directly to SobakaNodeTypes.
 */
export enum ModuleUI {
  Clock = 'Clock',
  Delay = 'Delay',
  Scope = 'Scope',
  Envelope = 'Envelope',
  Filter = 'Filter',
  // Input = 'Input',
  Lfo = 'Lfo',
  // Midi = 'Midi',
  Sequencer = 'Sequencer',
  Noise = 'Noise',
  Oscillator = 'Oscillator',
  String = 'String',
  Parameter = 'Parameter',
  // Quantiser = 'Quantiser',
  Reverb = 'Reverb',
  // SampleAndHold = 'SampleAndHold',
  // Sampler = 'Sampler',
  Output = 'Output',
  Vca = 'Vca'
}

export const get_component = (module: Module<ModuleUI>) => {
  return {
    [ModuleUI.Clock]: Clock,
    [ModuleUI.Delay]: Delay,
    [ModuleUI.Scope]: Scope,
    [ModuleUI.Envelope]: Envelope,
    [ModuleUI.Filter]: Filter,
    [ModuleUI.String]: String,
    // [ModuleUI.Input]: Input,
    [ModuleUI.Lfo]: Lfo,
    // [ModuleUI.Midi]: Midi,
    [ModuleUI.Sequencer]: Sequencer,
    [ModuleUI.Noise]: Noise,
    [ModuleUI.Oscillator]: Oscillator,
    [ModuleUI.Parameter]: Parameter,
    // [ModuleUI.Quantiser]: Quantiser,
    [ModuleUI.Reverb]: Reverb,
    // [ModuleUI.SampleAndHold]: SampleAndHold,
    // [ModuleUI.Sampler]: Sampler,
    [ModuleUI.Output]: Output,
    [ModuleUI.Vca]: Vca
  }[module.type]
}
