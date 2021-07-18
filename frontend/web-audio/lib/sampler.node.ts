// @ts-ignore
import samplerWorkletUrl from "./sampler.worklet";
import samplerWasmUrl from '../pkg/sobaka_sample_web_audio_bg.wasm'
import { EventBus, RPCAudioProcessorInterface, SendProgram } from "./interface";
import { SAMPLER_WORKLET } from "./constants";
import { RPC } from "./rpc";
import { AudioProcessor } from "../pkg/sobaka_sample_web_audio";

export class SamplerNode extends AudioWorkletNode implements Partial<AudioProcessor>, SendProgram {
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

  public subscribe<N extends keyof EventBus>(name: N): (set: EventBus[N]) => () => void {
    return (set) => {
      this.rpc.expose(name, set as any);
      return () => {
        // Cleanup
      }
    }
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

  public add_instrument(new_instrument: any) { // @todo fix type
    this.rpc.call('add_instrument', [new_instrument]);
  } 

  public destroy_instrument(instrument_uuid: string) {
    this.rpc.call('destroy_instrument', [instrument_uuid]);
  }

  public assign_instrument(step: number, instrument_uuid: string) {
    this.rpc.call('assign_instrument', [step, instrument_uuid]);
  }

  public unassign_instrument(step: number, instrument_uuid: string) {
    this.rpc.call('unassign_instrument', [step, instrument_uuid]);
  }

  public trigger_instrument(instrument_uuid: string) {
    this.rpc.call('trigger_instrument', [instrument_uuid]);
  }
}