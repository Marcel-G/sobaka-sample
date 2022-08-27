import { workspace, WorkspaceStore } from './state'
import { WorkspaceDocument } from '../worker/persistence'
import { getContext, setContext } from 'svelte'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'
export const get_workspace = () => getContext<WorkspaceStore>(WORKSPACE_CONTEXT)
export const init_workspace = (document: WorkspaceDocument) => {
  const space = workspace(document)
  setContext(WORKSPACE_CONTEXT, space)
  return space
}
