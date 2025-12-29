import { getContext, setContext } from 'svelte'
import { derived } from 'svelte/store'
import { Workspace } from '@sobaka/state/models/workspace'
import { createPositionStores, type PositionStore } from './positions'
import { createAudioGraph, type AudioGraph } from '@sobaka/dsp'
import { getGlobalCtx } from './global'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  dsp: AudioGraph
  positions: PositionStore
}

export const getWorkspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)

/**
 * Set up workspace context with automatic cleanup
 * Call this inside an $effect to handle workspace changes
 * Returns a cleanup function that should be called when the workspace is unmounted
 */
export const useWorkspace = (workspace: Workspace) => {
  const dsp = createAudioGraph(getGlobalCtx().audio)
  const positions = createPositionStores()

  // Subscribe to workspace state changes and reconcile the audio graph
  const unsubscribe = derived(
    [workspace.modules, workspace.links], 
    ([$modules, $links]) => [$modules, $links] as const
  ).subscribe(([modules, links]) => {
    dsp.reconcile(modules, links)
  })

  const ctx: WorkspaceContext = {
    workspace,
    dsp,
    positions
  }

  setContext(WORKSPACE_CONTEXT, ctx)

  // Return cleanup function
  return () => {
    unsubscribe()
    dsp.destroy()
  }
}
