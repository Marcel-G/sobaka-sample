import { getContext, setContext } from 'svelte'
import { Workspace } from '@sobaka/state/models/workspace'
import { createPositionStores, type PositionStore } from './positions'
import { createDsp, type AudioGraph } from '@sobaka/dsp'
import { getGlobalCtx } from './global'
import { PlugType, type LinkPoint, type Link } from '@sobaka/state/models/links'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

type WorkspaceContext = {
  workspace: Workspace
  dsp: AudioGraph
  positions: PositionStore
  getPlugType: (linkPoint: LinkPoint) => PlugType
}

/**
 * Normalize a link to ensure it's always output -> input/param/mixer
 * regardless of click order
 */
const normalizeLink = (link: Link, dsp: AudioGraph): Link => {
  const fromType = dsp.getPlugType(link.from.moduleId, link.from.routeName)
  const toType = dsp.getPlugType(link.to.moduleId, link.to.routeName)

  // If from is already output, keep as-is
  if (fromType === PlugType.Output) {
    return link
  }

  // If to is output, swap them
  if (toType === PlugType.Output) {
    return {
      ...link,
      from: link.to,
      to: link.from
    }
  }

  // Neither is output - invalid link, return as-is and let validation catch it
  return link
}

export const getWorkspace = () => getContext<WorkspaceContext>(WORKSPACE_CONTEXT)
export const initWorkspace = (workspace: Workspace) => {
  const dsp = createDsp(workspace, getGlobalCtx().audio)
  
  // Wrap workspace.addLink to normalize link direction
  const originalAddLink = workspace.addLink.bind(workspace)
  workspace.addLink = (link: Link): string => {
    const normalized = normalizeLink(link, dsp)
    
    // Validate the link
    if (!dsp.validateLink(normalized.from, normalized.to)) {
      console.warn('Invalid link rejected:', normalized)
      return '' // Return empty string for invalid links
    }
    
    return originalAddLink(normalized)
  }
  
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
