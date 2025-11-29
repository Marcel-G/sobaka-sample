// Stub for workspace context used by Mixer
// In actual usage, this is provided by the web app

export function get_workspace(): { workspace: any } {
  throw new Error('get_workspace must be called within app context')
}
