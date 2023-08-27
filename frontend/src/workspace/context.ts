import { SobakaWorkspaceStore } from '../models/WorkspaceStore'
import { getContext, setContext } from 'svelte'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

export const get_workspace_context = () => getContext<SobakaWorkspaceStore>(WORKSPACE_CONTEXT)
export const init_workspace_context = async (space: SobakaWorkspaceStore) => {
  setContext(WORKSPACE_CONTEXT, space)
}
