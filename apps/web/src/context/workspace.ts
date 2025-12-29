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
  destroy: () => void
}

export const getWorkspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)

export const initWorkspace = (workspace: Workspace) => {
  const dsp = createAudioGraph(getGlobalCtx().audio)
  const positions = createPositionStores()

  // Set up reactive reconciliation using Svelte's effect system
  let unsubscribe: (() => void) | null = null
  
  $effect(() => {
    // Subscribe to workspace changes and reconcile the audio graph
    unsubscribe = derived([workspace.modules, workspace.links], ([$modules, $links]) => [$modules, $links] as const)
      .subscribe(([modules, links]) => {
        dsp.reconcile(modules, links)
      })

    // Cleanup function
    return () => {
      unsubscribe?.()
    }
  })

  const ctx: WorkspaceContext = {
    workspace,
    dsp,
    positions,
    destroy: () => {
      unsubscribe?.()
      dsp.destroy()
    }
  }

  setContext(WORKSPACE_CONTEXT, ctx)

  return ctx
}
