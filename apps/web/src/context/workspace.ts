import { getContext, setContext } from 'svelte'
import { Workspace } from '/state/models/workspace'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
}

export const get_workspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)
export const init_workspace = (workspace: Workspace) => {
  const ctx: WorkspaceContext = {
    workspace
  }

  setContext(WORKSPACE_CONTEXT, ctx)
  return ctx
}
