import { browser } from '$app/environment'
import { error } from '@sveltejs/kit'
import { WorkspaceManager } from '../../../models/manager'
import { init_user } from '../../../models/user'
import type { PageLoad } from './$types'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  const manager = await WorkspaceManager.fromStorage(init_user())

  const id = event.params.slug

  if (!manager.loadWorkspace(id)) {
    throw error(404, 'Workspace does not exist')
  }

  return {
    managerData: manager.toData(),
    workspace: { id }
  }
}
