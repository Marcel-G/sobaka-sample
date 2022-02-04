import { Module } from '../state/modules'

import Clock from './Clock.svelte'
import Delay from './Delay.svelte'
import Envelope from './Envelope.svelte'
import Filter from './Filter.svelte'
import Lfo from './LFO.svelte'
import MultiSequencer from './MultiSequencer.svelte'
import Noise from './Noise.svelte'
import Oscillator from './Oscillator.svelte'
import Parameter from './Parameter.svelte'
import Quantiser from './Quantiser.svelte'
import Reverb from './Reverb.svelte'
import SampleAndHold from './SampleAndHold.svelte'
import Sink from './Sink.svelte'
import Volume from './Volume.svelte'

/**
 * Modules that can be spawned on the frontend.
 * These can be made up of several SobakaNodeTypes.
 * Core modules map directly to SobakaNodeTypes.
 */
export enum ModuleUI {
  Clock = 'Clock',
  Delay = 'Delay',
  Envelope = 'Envelope',
  Filter = 'Filter',
  Lfo = 'Lfo',
  MultiSequencer = 'MultiSequencer',
  Noise = 'Noise',
  Oscillator = 'Oscillator',
  Parameter = 'Parameter',
  Quantiser = 'Quantiser',
  Reverb = 'Reverb',
  SampleAndHold = 'SampleAndHold',
  Sink = 'Sink',
  Vca = 'Vca'
}

export const get_component = (module: Module<ModuleUI>) => {
  return {
    [ModuleUI.Clock]: Clock,
    [ModuleUI.Delay]: Delay,
    [ModuleUI.Envelope]: Envelope,
    [ModuleUI.Filter]: Filter,
    [ModuleUI.Lfo]: Lfo,
    [ModuleUI.MultiSequencer]: MultiSequencer,
    [ModuleUI.Noise]: Noise,
    [ModuleUI.Oscillator]: Oscillator,
    [ModuleUI.Parameter]: Parameter,
    [ModuleUI.Quantiser]: Quantiser,
    [ModuleUI.Reverb]: Reverb,
    [ModuleUI.SampleAndHold]: SampleAndHold,
    [ModuleUI.Sink]: Sink,
    [ModuleUI.Vca]: Volume
  }[module.type]
}
