import noiseGeneratorUrl from "worklet-loader!./noise.worklet.ts";
//@ts-ignore
import wasmSrcUrl from 'url-loader!../../backend/pkg/index_bg.wasm'
import { Message, MessageType } from "./interface";

export class NoiseGeneratorNode extends AudioWorkletNode {
  constructor(context: AudioContext) {
    super(context, "noise-generator");

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
  static async register(context: AudioContext): Promise<NoiseGeneratorNode> {
    // Fetch WASM source
    const src = await fetch(wasmSrcUrl);

    // Register AudioWorkletProcessor
    await context.audioWorklet.addModule(noiseGeneratorUrl);

    const node = new NoiseGeneratorNode(context);

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
      }, { once: true})
    })
  };

  onmessage = (event: Message) => {
    // No messages yet
  }
}