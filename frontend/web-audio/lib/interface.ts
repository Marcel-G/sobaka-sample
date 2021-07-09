import { AudioProcessor } from "../pkg/sobaka_sample_web_audio";

/**
 * Used for sending the wasm src code into the audio thread
 */
export type SendProgram = {
  send_wasm_program(data: ArrayBuffer): Promise<void>
}
export interface RPCAudioProcessorInterface extends Omit<
  AudioProcessor & SendProgram,
  'free' | 'process' | 'get_buffer' | 'set_buffer'
  > {}