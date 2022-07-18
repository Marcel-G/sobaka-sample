import { IJSONRPCSubscription, IJSONRPCSubscriptionResponse, is_subscription, SendProgram, Subscriber, Unsubscriber } from "./interface";
import { SAMPLER_WORKLET } from "./constants";
import { RequestManager, Client } from "@open-rpc/client-js";
import { PostMessageTransport } from "./postMessageTransport";
import { AbstractModule } from "./abstractModule";
import { In, Out } from "./conversion";

export class SobakaContext extends AudioWorkletNode implements SendProgram {
  client: Client
  private subscriptions: Map<
    number,
    Subscriber<IJSONRPCSubscriptionResponse<any>>
  > = new Map();

  constructor(context: AudioContext) {
    super(context, SAMPLER_WORKLET, { numberOfInputs: 1, outputChannelCount: [2] });
    const transport = new PostMessageTransport(this.port);
    const requestManager = new RequestManager([transport]);
    this.client = new Client(requestManager);

    this.client.onNotification((data) => {
      try {
        if (is_subscription(data)) {
          this.handle_subscription(data)
        }
      } catch (error) {
        // @todo where to catch this error
        console.warn(error)
      }
    });

    this.addEventListener('processorerror', console.error);
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
   * 
   * @param wasm_url - URL where the browser can download the raw `sobaka_sample_audio_worklet_bg.wasm` file
   * @param worklet_url - URL where the browser can download `sampler.worklet.ts`
   * @param context 
   * @returns 
   */
  static async register(
    wasm_url: string,
    worklet_url: string,
    context: AudioContext
  ): Promise<SobakaContext> {
    // Fetch WASM source
    const src = await fetch(wasm_url);

    // Register AudioWorkletProcessor
    await context.audioWorklet.addModule(worklet_url);

    const node = new SobakaContext(context);

    await node.send_wasm_program(await src.arrayBuffer())

    return node
  }

  private handle_subscription(data: IJSONRPCSubscription<any>) {
    const handler = this.subscriptions.get(data.params.subscription);

    if (handler) {
      handler(data?.params);
    }
  }

  public link<
    A extends AbstractModule<any>,
    B extends AbstractModule<any>
  >(from: A, from_port: number, to: B, to_port: number): () => void {
    const pending_cleanup = Promise.all([
      from.get_address(),
      to.get_address()
    ]).then(([address_a, address_b]) => {
      return this.client.request({
        method: 'connect',
        params: [
          `${address_a}/${Out(from_port)}`,
          `${address_b}/${In(to_port)}`,
        ]
      }) as Promise<number>
    })

    return async () => {
      void this.client.request({
        method: 'disconnect',
        params: [await pending_cleanup]
      })
    }
  }

  public subscribe<T extends object>(
    subscribe_method: string,
    unsubscribe_method: string,
    params: (string | number)[],
    callback: Subscriber<IJSONRPCSubscriptionResponse<T>>
  ): Unsubscriber
    {
    const pending_subscription = this.client.request({
      method: subscribe_method,
      params
    }).then((subscription_id: number) => {
      this.subscriptions.set(subscription_id, callback);
      return subscription_id;
    })

    return () => {
      void pending_subscription
        .then((subscription_id) => {
          this.subscriptions.delete(subscription_id);
          return this.client.request({
            method: unsubscribe_method,
            params: [subscription_id]
          })
        })
        .catch(console.warn)
    }
  }

  public async send_wasm_program(data: ArrayBuffer): Promise<void> {
    await this.client.request({
      method: 'send_wasm_program',
      params: [data]
    })
  }

  public async destroy(): Promise<void> {
    await this.client.notify({
      method: 'destroy',
    })
  }
}
