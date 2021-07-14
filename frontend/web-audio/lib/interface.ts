import { AudioProcessor } from "../pkg/sobaka_sample_web_audio";

/**
 * Used for sending the wasm src code into the audio thread
 */
export type SendProgram = {
  send_wasm_program(data: ArrayBuffer): Promise<void>
}

export type EventBus = {
  on_active_step(step: number): void,
  on_is_playing(is_playing: boolean): void,
  on_sequence(sequence: any): void,
  on_instruments(instruments: any): void
}
export interface RPCAudioProcessorInterface extends Omit<
  AudioProcessor & SendProgram & EventBus,
  'free' | 'process' | 'get_buffer' | 'set_buffer'
  > {}