import { AudioProcessor } from "../pkg/sobaka_sample_web_audio";

/**
 * Used for sending the wasm src code into the audio thread
 */
export type SendProgram = {
  send_wasm_program(data: ArrayBuffer): Promise<void>
}

export type EventBus = {
  on_sequence_step(step: number): void
}
export interface RPCAudioProcessorInterface extends Omit<
  AudioProcessor & SendProgram & EventBus,
  'free' | 'process' | 'get_buffer' | 'set_buffer'
  > {}