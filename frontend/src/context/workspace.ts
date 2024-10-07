import { getContext, setContext } from 'svelte'
import { Workspace } from '../models/workspace'
import { createPlugsContext, PlugsContext } from './plugs'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  plugs: PlugsContext
}

export const get_workspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)
export const init_workspace = (workspace: Workspace) => {
  const plugs = createPlugsContext(workspace)

  const ctx: WorkspaceContext = {
    workspace,
    plugs
  }

  setContext(WORKSPACE_CONTEXT, ctx)
  return ctx
}
