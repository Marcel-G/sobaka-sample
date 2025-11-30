import { getContext, setContext } from 'svelte'
import { Workspace } from '@sobaka/state/models/workspace'
import { createPositionStores, type PositionStore } from './positions'
import { createDsp, type AudioGraph } from '@sobaka/dsp'
import { getGlobalCtx } from './global'
import { PlugType, type LinkPoint } from '@sobaka/state/models/links'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  dsp: AudioGraph
  positions: PositionStore
  getPlugType: (linkPoint: LinkPoint) => PlugType
}

export const getWorkspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)

export const initWorkspace = (workspace: Workspace) => {
  const dsp = createDsp(workspace, getGlobalCtx().audio)
  
  const ctx: WorkspaceContext = {
    workspace,
    dsp,
    positions: createPositionStores(),
    getPlugType: (linkPoint: LinkPoint) => {
      return dsp.getPlugType(linkPoint.moduleId, linkPoint.routeName) ?? PlugType.Input
    }
  }

  setContext(WORKSPACE_CONTEXT, ctx)
  return ctx
}
