// @ts-ignore
import samplerWorkletUrl from "./sampler.worklet";
import samplerWasmUrl from '../pkg/sobaka_sample_web_audio_bg.wasm'
import { RPCAudioProcessorInterface } from "./interface";
import { SAMPLER_WORKLET } from "./constants";
import { RPC } from "./rpc";

export class SamplerNode extends AudioWorkletNode implements RPCAudioProcessorInterface {
  private rpc: RPC<RPCAudioProcessorInterface, MessagePort>
  constructor(context: AudioContext) {
    super(context, SAMPLER_WORKLET);
    this.rpc = new RPC(this.port);

    this.addEventListener('processorerror', console.error)
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

    await node.send_wasm_program(await src.arrayBuffer())

    return node
  }

  public send_wasm_program(data: ArrayBuffer): Promise<void> {
    // @todo return types are nested
    return this.rpc.call('send_wasm_program', [data]) as unknown as Promise<void>;
  }

  public play() {
    this.rpc.call('play', []);
  }

  public stop() {
    this.rpc.call('stop', []);
  }

  public update_sample(track: number, sample: number, value: boolean) {
    this.rpc.call('update_sample', [track, sample, value]);
  }
}