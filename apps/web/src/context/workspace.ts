import { getContext, setContext, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import { Workspace } from '@sobaka/state/models/workspace'
import { createPositionStores, type PositionStore } from './positions'
import { createAudioGraph, type AudioGraph } from '@sobaka/dsp'
import { getGlobalCtx } from './global'
import { pluginRegistry } from '../plugins'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  dsp: AudioGraph
  positions: PositionStore
}

export const getWorkspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)

/**
 * Initialize workspace context
 * Sets up DSP, positions, and automatic reconciliation
 * Cleans up automatically on component unmount
 */
export const initWorkspaceContext = (workspace: Workspace) => {
  const dsp = createAudioGraph(getGlobalCtx().audio, pluginRegistry)
  const positions = createPositionStores()

  // Set up reactive reconciliation
  const unsubscribe = derived(
    [workspace.modules, workspace.links],
    ([$modules, $links]) => [$modules, $links] as const
  ).subscribe(([modules, links]) => {
    dsp.reconcile(modules, links)
  })

  // Clean up on unmount with fade to avoid pops
  onDestroy(() => {
    unsubscribe()
    // Use destroyWithFade for graceful audio teardown
    // The fade is scheduled in the audio context, so it completes even if we don't await
    void dsp.destroyWithFade()
  })

  const ctx: WorkspaceContext = {
    workspace,
    dsp,
    positions
  }

  setContext(WORKSPACE_CONTEXT, ctx)

  return ctx
}
