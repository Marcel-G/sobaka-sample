import './TextEncoder'
import { Message, MessageType } from "./interface";
import init, { InitOutput } from '../../backend/pkg';

class NoiseGeneratorProcessor extends AudioWorkletProcessor {
  FRAME_SIZE = 128;
  BYTES_PER_F32 = 32 / 8;
  buffers: Float32Array[] | null = null
  buffersPtrs: number[] | null = null
  _instance: InitOutput | null = null
  static get parameterDescriptors() {
    return [
      { name: "amplitude", defaultValue: 0.25, minValue: 0, maxValue: 1 }
    ];
  }
  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }
  private handleMessage(message: Message) {
    switch (message.type) {
      case MessageType.SendWasm: {
        this.init(message.data);
        break;
      }
      default: {
        throw new Error(`Command ${message.type} not recognised`);
      }
    }
  }
  private async init(data: ArrayBuffer) {
    const module = await WebAssembly.compile(data);
    const instance = await init(module)

    const message: Message  = {
      type: MessageType.WasmLoaded,
    }

    this._instance = instance;

    this.buffersPtrs = new Array(2) // Allocate buffers for two channels
      .fill(0)
      .map(() => this._instance!.alloc(this.FRAME_SIZE))

    this.buffers = this.buffersPtrs
      .map((ptr) =>
        new Float32Array(
          this._instance!.memory.buffer,
          ptr,
          this.FRAME_SIZE
        )
      )

    this.port.postMessage(message)
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
    if (!outputs[0]?.[0] || !this.buffers || !this._instance || !this.buffersPtrs) {
      return true;
    }
    let output = outputs[0];

    this._instance.process(
      this.buffersPtrs[0],
      this.buffersPtrs[1],
      this.FRAME_SIZE
    )

    output[0]?.set(this.buffers[0])
    output[1]?.set(this.buffers[1])

    return true;
  }
}

registerProcessor("noise-generator", NoiseGeneratorProcessor);
