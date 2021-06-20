export enum MessageType {
  SendWasm = "SEND_WASM",
  WasmLoaded = "WASM_LOADER"
}

export interface Message {
  type: MessageType,
  data?: any
}