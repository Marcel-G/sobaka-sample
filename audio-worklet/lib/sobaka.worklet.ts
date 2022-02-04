/**
 * This worklet executed in an AudioWorkletGlobalScope which means
 * many features are missing eg. setTimeout, setInterval, fetch, crypto api etc.
 * 
 * https://searchfox.org/mozilla-central/source/dom/webidl/AudioWorkletGlobalScope.webidl
 */
import { IJSONRPCRequest, IJSONRPCResponse } from '@open-rpc/client-js/build/Request';
import 'fastestsmallesttextencoderdecoder'; // Add missing TextDecoder/TextEncoder in worklet env
import init, { AudioProcessor } from '../pkg/sobaka_sample_audio_worklet';
import { SAMPLER_WORKLET } from './constants';
import { is_destroy_destroy_event, is_send_wasm_program_event, WasmProgramEvent } from './interface';
class SobakaProcessor extends AudioWorkletProcessor {
  private instance: AudioProcessor | null = null
  private is_destroyed = false
  constructor(options?: AudioWorkletNodeOptions) {
    super(options);

    // Temporary hack for loading the wasm binary
    // See sampler.node.ts#register
    this.port.onmessage = () => {}
    this.port.addEventListener('message', (event: MessageEvent<IJSONRPCRequest>) => {
      const message = event.data;
      if (is_send_wasm_program_event(message)) {
        void this.init(message);
      } else
      if (is_destroy_destroy_event(message)) {
        this.destroy()
      }
    })

  }

  private async init(message: WasmProgramEvent) {
    if (this.instance) {
      throw new Error('Program already initialised')
    }
    if (this.is_destroyed) {
      throw new Error('Audio worklet has already been destroyed')
    }

    const data = message.params[0];
    const module = await WebAssembly.compile(data);
    await init(module);

    // eslint-disable-next-line no-undef
    this.instance = new AudioProcessor(this.port, sampleRate);

    // No real rpc client initialised so respond manually
    const response: IJSONRPCResponse = {
      jsonrpc: '2.0',
      id: message.id,
      result: true
    };

    this.port.postMessage(JSON.stringify(response))
  }

  private destroy () {
    this.is_destroyed = true
    this.instance = null
  }
  /**
   * Each channel has 128 samples. Inputs[n][m][i] will access n-th input,
   * m-th channel of that input, and i-th sample of that channel.
   * https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process
   */
  public process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    // eslint-disable-next-line no-unused-vars
    parameters: Record<string, Float32Array>
  ): boolean {
    if (this.is_destroyed) {
      return false
    }
    if (!outputs[0]?.[0] || !this.instance) {
      return true;
    }

    // Transfer input data to wasm instance
    inputs[0].forEach((input, index) => {
      this.instance!.set_buffer(index, input)
    })

    // Process data in buffers
    this.instance.process()

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

registerProcessor(SAMPLER_WORKLET, SobakaProcessor);