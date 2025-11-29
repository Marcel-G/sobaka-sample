import { getContext, setContext } from 'svelte'
import { Workspace } from '@sobaka/state/models/workspace'
import { createPositionStores } from './positions'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  positions: ReturnType<typeof createPositionStores>
}

export const get_workspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)
export const init_workspace = (workspace: Workspace) => {
  const ctx: WorkspaceContext = {
    workspace,
    positions: createPositionStores()
  }

  setContext(WORKSPACE_CONTEXT, ctx)
  return ctx
}
