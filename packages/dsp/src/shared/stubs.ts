// Stub types for unimplemented DSP classes
// These are used by UI components that are currently disabled

export type OscillatorShape = 'Sine' | 'Square' | 'Triangle' | 'Saw';

export interface Sequencer {
  create(audioContext: AudioContext): Promise<Sequencer>
  node(): AudioNode
  subscribe(callback: (event: any) => void): void
  command(cmd: any): void
  destroy(): void
  free(): void
}

export interface StepSequencer {
  create(audioContext: AudioContext): Promise<StepSequencer>
  node(): AudioNode
  subscribe(callback: (event: any) => void): void
  command(cmd: any): void
  destroy(): void
  free(): void
}

export interface Point {
  max: number
  min: number
}

export type PointBufferData = Point[][]

export interface ScopeController {
  create(audioContext: AudioContext): Promise<ScopeController>
  node(): AudioNode
  frame(): PointBufferData | null
  command(cmd: any): void
  destroy(): void
  free(): void
}
