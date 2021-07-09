import 'fastestsmallesttextencoderdecoder'; // Add missing TextDecoder/TextEncoder in worklet env
import init, { AudioProcessor } from '../pkg';
import { SAMPLER_WORKLET } from './constants';
import { RPCAudioProcessorInterface } from './interface';
import { RPC } from './rpc';

class SamplerProcessor extends AudioWorkletProcessor {
  private instance: AudioProcessor | null = null
  private rpc: RPC<RPCAudioProcessorInterface, MessagePort>
  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    this.rpc = new RPC(this.port);

    this.rpc.expose('send_wasm_program', this.init.bind(this));
  }
  private async init(data: ArrayBuffer) {
    const module = await WebAssembly.compile(data);
    await init(module);

    this.instance = new AudioProcessor();

    this.rpc.expose('play', this.instance.play.bind(this.instance));
    this.rpc.expose('stop', this.instance.stop.bind(this.instance));
    this.rpc.expose('update_sample', this.instance.update_sample.bind(this.instance));
  }
  /**
   * Each channel has 128 samples. Inputs[n][m][i] will access n-th input,
   * m-th channel of that input, and i-th sample of that channel.
   * https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process
   */
  public process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    if (!outputs[0]?.[0] || !this.instance) {
      return true;
    }

    // Transfer input data to wasm instance
    inputs[0].forEach((input, index) => {
      this.instance!.set_buffer(index, input)
    })

    // Process data in buffers
    this.instance!.process()

    // Transfer data to AudioWorkletProcessor output
    outputs[0].forEach((output, index) => {
      // Is get_buffer allocating a new Float32Array each cycle?
      // Could cause some GC
      output.set(this.instance!.get_buffer(index))
    })

    // @todo return false when isShutdown
    // How to cleanup wasm instance?
    return true;
  }
}

registerProcessor(SAMPLER_WORKLET, SamplerProcessor);