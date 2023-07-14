import { SobakaMetadata } from '../lib/YIpfsAdapter'
import { workspace, WorkspaceStore } from './state'
import { getContext, setContext } from 'svelte'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

export const get_workspace = () => getContext<WorkspaceStore>(WORKSPACE_CONTEXT)
export const init_workspace = (init: SobakaMetadata) => {
  const space = workspace(init)
  setContext(WORKSPACE_CONTEXT, space)
  return space
}
