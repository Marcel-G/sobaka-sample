export enum MessageType {
  SendWasm = "SEND_WASM",
  WasmLoaded = "WASM_Loaded"
}

export interface Message {
	type: MessageType,
  data?: any
}