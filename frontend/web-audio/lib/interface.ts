export enum MessageType {
  SendWasm = "SEND_WASM",
  WasmLoaded = "WASM_LOADER",
  Play = 'PLAY',
  Stop = 'STOP',
  UpdateSample = 'UPDATE_SAMPLE'
}

export interface Message {
  type: MessageType,
  data?: any
}