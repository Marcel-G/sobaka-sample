import { browser } from '$app/environment'
import { redirect } from '@sveltejs/kit'
import { WorkspaceManager } from '../../../models/manager'
import { init_user } from '../../../models/user'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  const manager = await WorkspaceManager.fromStorage(init_user())

  const { guid } = manager.storageSynced().addWorkspace()

  throw redirect(307, `/workspace/${guid}`)
}
