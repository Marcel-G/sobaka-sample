/* eslint-disable no-undef */
/**
 * AudioWorklet notes:
 * 
 * 1. This worklet executed in an AudioWorkletGlobalScope which means
 *    many features are missing eg. setTimeout, setInterval, fetch, crypto api etc.
 *      - https://searchfox.org/mozilla-central/source/dom/webidl/AudioWorkletGlobalScope.webidl
 * 2. Fetching the wasm module has to take place on the main thread.
 * 3. Compiling the wasm module should ideally be done on the main thread too.
 *      - https://github.com/rustwasm/wasm-bindgen/tree/main/examples/wasm-audio-worklet
 *    However, Safari does not support transferring WebAssembly.Module or WebAssembly.Memory
 *    over to the worklet.
 *      - https://bugs.webkit.org/show_bug.cgi?id=220038
 *    Next best is to send the wasm source code to the worklet and compile it on initialisation.
 * 4. Firefox does not support ES6 module syntax in the worklets. Worklet code needs to be transpiled.
 *      - https://bugzilla.mozilla.org/show_bug.cgi?id=1572644
 * 5. Communication is done with messages, for that the TextDecoder & TextEncoder need to be
 *    polyfilled in the worklet
 *      - https://github.com/anonyco/FastestSmallestTextEncoderDecoder
 * 6. The worklet is given to `add_module()` as a URL
 */

import './polyfill'
import type { IJSONRPCRequest, IJSONRPCResponse } from '@open-rpc/client-js/build/Request';
import init, { SobakaAudioWorkletProcessor } from '../../pkg/sobaka_sample_audio_worklet';

const is_destroy_destroy_event = (message: IJSONRPCRequest): message is IJSONRPCRequest => {
  return message.method === 'destroy'
}

type WasmProgramEvent = IJSONRPCRequest & { params: [ArrayBuffer] };

const is_send_wasm_program_event = (message: IJSONRPCRequest): message is WasmProgramEvent => {
  return message.method === 'send_wasm_program'
}
class SobakaProcessor extends AudioWorkletProcessor {
  private processor: SobakaAudioWorkletProcessor | null = null
  private is_destroyed = false
  constructor() {
    super();

    // Temporary hack for loading the wasm binary
    // See sampler.node.ts#register
    this.port.onmessage = () => {}
    this.port.addEventListener('message', (event: MessageEvent<IJSONRPCRequest>) => {
      const message = event.data;
      if (is_destroy_destroy_event(message)) {
        this.destroy()
      } else
      if (is_send_wasm_program_event(message)) {
        void this.init(message);
      }
    })
  }

  private async init(message: WasmProgramEvent) {
    if (this.processor) {
      throw new Error('Program already initialised')
    }
    if (this.is_destroyed) {
      throw new Error('Audio worklet has already been destroyed')
    }

    const data = message.params[0];

    const module = await WebAssembly.compile(data);
    await init(module);

    // eslint-disable-next-line no-undef
    this.processor = new SobakaAudioWorkletProcessor();
    this.processor.init_messaging(this.port)
    // eslint-disable-next-line no-undef
    this.processor.set_sample_rate(sampleRate)

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
    this.processor = null
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

    if (!outputs[0]?.[0] ||  !outputs[0]?.[1] || !this.processor) {
      return true;
    }

    // Only supports mono inputs for the moment
    const input = inputs[0][0] || new Float32Array()

    // Process data in buffers
    this.processor.process(input, outputs[0][0], outputs[0][1])

    // @todo return false when isShutdown
    // How to cleanup wasm instance?
    return true;
  }
}

registerProcessor('SAMPLER_WORKLET', SobakaProcessor);