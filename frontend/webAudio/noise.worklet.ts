import './TextEncoder'
import { Message, MessageType } from "./interface";
import init, { AudioProcessor } from '../../backend/pkg';

class NoiseGeneratorProcessor extends AudioWorkletProcessor {
  _instance: AudioProcessor | null = null
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
    await init(module);

    const message: Message  = {
      type: MessageType.WasmLoaded,
    }

    this._instance = new AudioProcessor();

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
    if (!outputs[0]?.[0] || !this._instance) {
      return true;
    }

    // Transfer input data to wasm instance
    inputs[0].forEach((input, index) => {
      this._instance!.set_buffer(index, input)
    })

    // Process data in buffers
    this._instance!.process()

    // Transfer data to AudioWorkletProcessor output
    outputs[0].forEach((output, index) => {
      output.set(this._instance!.get_buffer(index))
    })

    // @todo return false when isShutdown
    // How to cleanup wasm instance?
    return true;
  }
}

registerProcessor("noise-generator", NoiseGeneratorProcessor);
