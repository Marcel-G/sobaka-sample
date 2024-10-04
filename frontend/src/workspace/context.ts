import * as Y from 'yjs'
import { getContext, setContext } from 'svelte'
import { workspace, WorkspaceStore } from './workspace'

const WORKSPACE_CONTEXT = 'WORKSPACE_CONTEXT'

export const get_workspace = () => getContext<WorkspaceStore>(WORKSPACE_CONTEXT)
export const init_workspace = (doc: Y.Doc) => {
  const space = workspace(doc)
  setContext(WORKSPACE_CONTEXT, space)
  return space
}
