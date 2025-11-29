// Type stubs for DSP classes that are not yet implemented
// These modules (Sequencer, StepSequencer, Scope) are currently disabled
// but their UI components exist for future implementation

declare module '@sobaka/dsp' {
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
}
