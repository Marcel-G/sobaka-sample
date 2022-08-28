/**
 * This worklet executed in an AudioWorkletGlobalScope which means
 * many features are missing eg. setTimeout, setInterval, fetch, crypto api etc.
 * 
 * https://searchfox.org/mozilla-central/source/dom/webidl/AudioWorkletGlobalScope.webidl
 */

import type { IJSONRPCRequest } from '@open-rpc/client-js/build/Request';
import type * as Bindgen from '../../pkg/sobaka_sample_audio_worklet'

declare const bindgen: typeof Bindgen

export const is_destroy_destroy_event = (message: IJSONRPCRequest): message is IJSONRPCRequest => {
  return message.method === 'destroy'
}
class SobakaProcessor extends AudioWorkletProcessor {
  private processor: Bindgen.SobakaAudioWorkletProcessor | null = null
  private is_destroyed = false
  constructor(options?: AudioWorkletNodeOptions) {
    super();
    let [module, memory, handle] = options!.processorOptions as [BufferSource, WebAssembly.Memory, number];

    bindgen.initSync(module, memory);
    this.processor = bindgen.SobakaAudioWorkletProcessor.unpack(handle);

    this.processor.init_messaging(this.port)
    // eslint-disable-next-line no-undef
    // this.processor.set_sample_rate(sampleRate)

    // Temporary hack for loading the wasm binary
    // See sampler.node.ts#register
    this.port.onmessage = () => {}
    this.port.addEventListener('message', (event: MessageEvent<IJSONRPCRequest>) => {
      const message = event.data;
      if (is_destroy_destroy_event(message)) {
        this.destroy()
      }
    })
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