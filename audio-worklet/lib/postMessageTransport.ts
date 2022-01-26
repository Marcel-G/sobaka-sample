
import { Transport } from "@open-rpc/client-js/build/transports/Transport";
import { JSONRPCRequestData, IJSONRPCData, getNotifications } from "@open-rpc/client-js/build/Request";

/**
 * Custom transport for RPC to use postMessage on AudioWorklet port
 * https://surma.dev/things/is-postmessage-slow/
 */
export class PostMessageTransport extends Transport {
  public port: MessagePort;

  constructor(port: MessagePort) {
    super();
    this.port = port;
  }
  private messageHandler = (event: MessageEvent) => {
    const data = typeof event.data !== 'string'
      ? JSON.stringify(event.data)
      : event.data;

    this.transportRequestManager.resolveResponse(data);
  }
  public connect(): Promise<any> {
    this.port.onmessage = () => {}; // Required or else no messages come through
    this.port.addEventListener("message", this.messageHandler);

    return Promise.resolve();
  }

  // eslint-disable-next-line no-unused-vars
  public async sendData(data: JSONRPCRequestData, timeout: number | null = 5000): Promise<any> {
    const prom = this.transportRequestManager.addRequest(data, null);
    const notifications = getNotifications(data);
    if (this.port) {
      this.port.postMessage((data as IJSONRPCData).request);
      this.transportRequestManager.settlePendingRequest(notifications);
    }
    return prom;
  }

  public close(): void {
    this.port.removeEventListener("message", this.messageHandler);
  }
}
