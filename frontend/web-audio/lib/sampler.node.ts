// @ts-ignore
import samplerWorkletUrl from "./sampler.worklet";
import samplerWasmUrl from '../pkg/sobaka_sample_web_audio_bg.wasm'
import { Message, MessageType } from "./interface";
import { SAMPLER_WORKLET } from "./constants";

export class SamplerNode extends AudioWorkletNode {
  constructor(context: AudioContext) {
    super(context, SAMPLER_WORKLET);

    this.port.onmessage = (event) => this.onmessage(event.data);
  }
  /**
   * Workaround for WASM + AudioWorkletProcessor
   * https://www.toptal.com/webassembly/webassembly-rust-tutorial-web-audio
   * see:
   *  - https://github.com/rustwasm/wasm-pack/issues/689
   *  - https://github.com/rustwasm/wasm-bindgen/issues/210#issuecomment-692813558
   *
   * Best solution for the mean time:
   * 1. fetch the .wasm file
   * 2. use postMessage to transfer the data as arrayBuffer to the Processor
   * 3. instantiate a WebAssembly instance from the buffer
   */
  static async register(context: AudioContext): Promise<SamplerNode> {
    // Fetch WASM source
    // @ts-ignore @todo should use wasm-loader.d.ts
    const src = await fetch(samplerWasmUrl);

    // Register AudioWorkletProcessor
    await context.audioWorklet.addModule(samplerWorkletUrl);

    const node = new SamplerNode(context);

    await node.init(await src.arrayBuffer())

    return node
  }

  private init(wasmSrc: ArrayBuffer): Promise<void> {
    const message: Message = {
      type: MessageType.SendWasm,
      data: wasmSrc 
    }

    this.port.postMessage(message)

    return new Promise((resolve, reject) => {
      // Reject on processor initialisation error
      this.addEventListener(
        'processorerror',
        reject,
        { once: true}
      )
      // Resolve on successful processor load
      this.port.addEventListener('message', (event) => {
        if (event.data.type === MessageType.WasmLoaded) {
          resolve()
        } else {
          debugger;
          reject(new Error('Expecting initialisation message'))
        }
      }, { once: true })
    })
  };

  onmessage = (event: Message) => {
    // No messages yet
  }
}