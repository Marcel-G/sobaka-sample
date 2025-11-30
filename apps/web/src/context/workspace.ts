import { getContext, setContext } from 'svelte'
import { Workspace } from '@sobaka/state/models/workspace'
import { createPositionStores, type PositionStore } from './positions'
import { createDsp, type AudioGraph } from '@sobaka/dsp'
import { getGlobalCtx } from './global'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  dsp: AudioGraph
  positions: PositionStore
}

export const getWorkspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)
export const initWorkspace = (workspace: Workspace) => {
  const ctx: WorkspaceContext = {
    workspace,
    dsp: createDsp(workspace, getGlobalCtx().audio),
    positions: createPositionStores()
  }

  setContext(WORKSPACE_CONTEXT, ctx)
  return ctx
}
