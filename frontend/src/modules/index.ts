/**
 * Modules that can be spawned on the frontend.
 * These can be made up of several SobakaNodeTypes.
 * Core modules map directly to SobakaNodeTypes.
 */
export enum ModuleUI {
  // Core module types
  Clock = 'Clock',
  Delay = 'Delay',
  Envelope = 'Envelope',
  Oscillator = 'Oscillator',
  Parameter = 'Parameter',
  Sink = 'Sink',
  Vca = 'Vca',
  // Frontend module types
  MultiSequencer = 'MultiSequencer',
  Lfo = 'Lfo'
}
