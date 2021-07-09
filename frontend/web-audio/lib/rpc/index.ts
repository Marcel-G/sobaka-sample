import { EventEmitter } from 'eventemitter3';
import { RPCError } from './error';
import { RPCMessage, RPCMessageWithCounter, RPCMethod, RPCReply } from './interfaces';

export class RPC<
  I extends { [key: string]: (...args: any) => any },
  P extends MessagePort
  > extends EventEmitter {
  private unsubscribeCallback: () => void;

  private calls: {
    [id: number]: (err: null | RPCError, result: any) => void;
  } = Object.create(null);

  private callCounter = 0;

  constructor(private readonly target: P) {
    super();

    // for some reason no message events arrive when onmessage is not set.
    target.onmessage = () => { };
    target.addEventListener('message', this.listener);
    this.unsubscribeCallback = () => { target.removeEventListener('message', this.listener) }
  }

  public expose<N extends keyof I>(method: N, handler: I[N]): this {
    this.on(method as string, async (data: RPCMethod<I, N>) => {
      try {
        const result = await handler(...data.args as any)

        this.post({
          type: 'reply',
          id: data.id,
          result
        })
      } catch (error) {
        this.post({
          type: 'reply',
          id: data.id,
          error: error instanceof RPCError
            ? error.toReplyError()
            : {
              code: 0,
              message: error.stack || error.message
            }
        } as RPCReply<I, N>)
      }
    })

    return this;
  }

  public call<N extends keyof I>(
    method: N,
    args: Parameters<I[N]>
  ): Promise<ReturnType<I[N]>> | void {
    const id = this.callCounter;

    const packet: RPCMethod<I, N> = {
      type: 'method',
      id,
      args,
      method,
    }

    this.post<N>(packet);

    return new Promise((resolve, reject) => {
      this.calls[id] = (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res)
        }
      }
    })
  }

  public destroy() {
    this.unsubscribeCallback();
  }

  private listener = (event: MessageEvent) => {
    // @todo guard this type casing
    const packet: RPCMessageWithCounter<I, any> = event.data

    // @todo Check for ready ?

    // Dispatch @todo handle out of order events
    this.dispatchIncoming(packet);
  }

  private dispatchIncoming(packet: RPCMessageWithCounter<I, any>) {
    switch (packet.type) {
      case 'method':
        if (this.listeners(packet.method).length > 0) {
          this.emit(packet.method, packet);
          return;
        }

        this.post({
          type: 'reply',
          id: packet.id,
          error: { code: 4003, message: `Unknown method name "${packet.method}"` },
          result: null as any,
        });
        break;
      case 'reply':
        this.handleReply(packet);
        break;
      default:
      // Ignore
    }
  }

  private handleReply(packet: RPCReply<I, any>) {
    const handler = this.calls[packet.id];
    if (!handler) {
      return;
    }

    if (packet.error) {
      handler(new RPCError(
        packet.error.code,
        packet.error.message,
        packet.error.path
      ),
        null);
    } else {
      handler(null, packet.result);
    }

    delete this.calls[packet.id];
  }

  private post<N extends keyof I>(message: RPCMessage<I, N>) {
    (message as RPCMessageWithCounter<I, N>).counter = this.callCounter++;

    this.target.postMessage(message);
  }
}