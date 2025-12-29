import { getContext, setContext, onDestroy } from 'svelte'
import { Workspace } from '@sobaka/state/models/workspace'
import { createPositionStores, type PositionStore } from './positions'
import { createDsp, type AudioGraph } from '@sobaka/dsp'
import { getGlobalCtx } from './global'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  dsp: AudioGraph
  positions: PositionStore
  destroy: () => void
}

export const getWorkspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)

export const initWorkspace = (workspace: Workspace) => {
  const dsp = createDsp(workspace, getGlobalCtx().audio)
  const positions = createPositionStores()

  const ctx: WorkspaceContext = {
    workspace,
    dsp,
    positions,
    destroy: () => {
      dsp.destroy()
    }
  }

  setContext(WORKSPACE_CONTEXT, ctx)
  
  // Automatically cleanup when component unmounts
  onDestroy(() => {
    ctx.destroy()
  })

  return ctx
}
