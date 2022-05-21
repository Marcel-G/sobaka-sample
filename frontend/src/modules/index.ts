import { Module } from '../state/modules'

import Oscillator from './Oscillator.svelte'
import Parameter from './Parameter.svelte'
import Sink from './Sink.svelte'

/**
 * Modules that can be spawned on the frontend.
 * These can be made up of several SobakaNodeTypes.
 * Core modules map directly to SobakaNodeTypes.
 */
export enum ModuleUI {
  // Clock = 'Clock',
  // Delay = 'Delay',
  // Envelope = 'Envelope',
  // Filter = 'Filter',
  // Input = 'Input',
  // Lfo = 'Lfo',
  // Midi = 'Midi',
  // MultiSequencer = 'MultiSequencer',
  // Noise = 'Noise',
  Oscillator = 'Oscillator',
  Parameter = 'Parameter',
  // Quantiser = 'Quantiser',
  // Reverb = 'Reverb',
  // SampleAndHold = 'SampleAndHold',
  // Sampler = 'Sampler',
  Sink = 'Sink',
  // Vca = 'Vca'
}

export const get_component = (module: Module<ModuleUI>) => {
  return {
    // [ModuleUI.Clock]: Clock,
    // [ModuleUI.Delay]: Delay,
    // [ModuleUI.Envelope]: Envelope,
    // [ModuleUI.Filter]: Filter,
    // [ModuleUI.Input]: Input,
    // [ModuleUI.Lfo]: Lfo,
    // [ModuleUI.Midi]: Midi,
    // [ModuleUI.MultiSequencer]: MultiSequencer,
    // [ModuleUI.Noise]: Noise,
    [ModuleUI.Oscillator]: Oscillator,
    [ModuleUI.Parameter]: Parameter,
    // [ModuleUI.Quantiser]: Quantiser,
    // [ModuleUI.Reverb]: Reverb,
    // [ModuleUI.SampleAndHold]: SampleAndHold,
    // [ModuleUI.Sampler]: Sampler,
    [ModuleUI.Sink]: Sink,
    // [ModuleUI.Vca]: Volume
  }[module.type]
}
