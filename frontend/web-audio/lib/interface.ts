import { IJSONRPCNotification } from "@open-rpc/client-js/build/Request";
import { AudioProcessor } from "../pkg/sobaka_sample_web_audio";

export interface IJSONRPCSubscriptionResponse<T extends object> {
  result: T,
  subscription: number
}

export interface IJSONRPCSubscription<T extends object> {
  jsonrpc: "2.0";
  id?: null | undefined;
  method: string;
  params: IJSONRPCSubscriptionResponse<T>;
}

export const is_subscription = (data: IJSONRPCNotification): data is IJSONRPCSubscription<any> => {
  return 'subscription' in data.params
}

/** Callback to inform of a value updates. */
export type Subscriber<T> = (value: T) => void;
/** Unsubscribes from value updates. */
export type Unsubscriber = () => void;

/**
 * Used for sending the wasm src code into the audio thread
 */
export type SendProgram = {
  send_wasm_program(data: ArrayBuffer): Promise<void>
}

export interface RPCAudioProcessorInterface extends Omit<
  AudioProcessor & SendProgram,
  'free' | 'process' | 'get_buffer' | 'set_buffer'
  > {}