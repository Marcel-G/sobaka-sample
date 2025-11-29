// Stub for global context used by UI modules
// In actual usage, these modules are used within the web app's context

export interface Global {
  audio: AudioContext
}

export function getGlobalCtx(): Global {
  // This will be provided by the app context
  throw new Error('getGlobalCtx must be called within app context')
}
