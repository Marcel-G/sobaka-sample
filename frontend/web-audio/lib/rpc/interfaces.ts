
// // @todo what about using a mapped type here
// export type RPCMethod<
//   I extends { [key: string]: (...args: any) => any }
// > = {
//   [K in keyof I]: {
//     type: 'method'
//     id: number
//     method: K // Constrain to methods of interface
//     args: Parameters<I[K]>
//   }
// }[keyof I]

/**
 * I: Interface definition for RPC communication
 * N: Method of method call
 */
export interface RPCMethod<
  I extends { [key: string]: (...args: any) => any },
  N extends keyof I,
> {
  type: 'method'
  id: number
  method: N
  args: Parameters<I[N]> // Constrain to args of interface
}

export interface RPCReply<
  I extends { [key: string]: (...args: any) => any },
  N extends keyof I,
> {
  type: 'reply'
  id: number
  result: ReturnType<I[N]>
  error?: {
    code: number
    message: string
    path?: string[]
  }
}

export type RPCMessage<
  I extends { [key: string]: (...args: any) => any },
  N extends keyof I,
> = RPCMethod<I, N> | RPCReply<I, N>;

export type RPCMessageWithCounter<
  I extends { [key: string]: (...args: any) => any },
  N extends keyof I,
> = RPCMessage<I, N> & { counter: number };
