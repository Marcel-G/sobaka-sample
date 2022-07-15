/* eslint-disable no-unused-vars */
import { IJSONRPCNotification, IJSONRPCRequest } from "@open-rpc/client-js/build/Request";
import type { SobakaAudioWorklet } from "../pkg/sobaka_sample_audio_worklet";

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

/**
 * Used for sending the wasm src code into the audio thread
 */
export type SendProgram = {
  send_wasm_program(data: ArrayBuffer): Promise<void>
}

export type RPCAudioProcessorInterface = Omit<
  SobakaAudioWorklet & SendProgram,
  'free' | 'process' | 'get_buffer' | 'set_buffer'
  >


export type WasmProgramEvent = IJSONRPCRequest & { params: [ArrayBuffer] };

export const is_send_wasm_program_event = (message: IJSONRPCRequest): message is WasmProgramEvent => {
  return message.method === 'send_wasm_program'
}

export const is_destroy_destroy_event = (message: IJSONRPCRequest): message is IJSONRPCRequest => {
  return message.method === 'destroy'
}