/* eslint-disable no-unused-vars */
import { IJSONRPCNotification, IJSONRPCRequest } from "@open-rpc/client-js/build/Request";

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

export const is_subscription = (data: IJSONRPCNotification): data is IJSONRPCSubscription<Record<string, unknown>> => {
  return 'subscription' in data.params
}

/** Callback to inform of a value updates. */
export type Subscriber<T> = (value: T) => void;
/** Unsubscribes from value updates. */
export type Unsubscriber = () => void;

export type WasmProgramEvent = IJSONRPCRequest & { params: [ArrayBuffer] };
