import { browser } from '$app/environment'
import { error, redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { get_storage } from '../../../../worker/storage'
import { type SobakaWorkspace } from '../../../../models/Workspace'

export const load: PageLoad = async () => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  let workspace: SobakaWorkspace
  try {
    const storage = await get_storage()
    workspace = await storage.init_workspace()
    console.log(workspace)
  } catch (e) {
    console.error(e)
    throw error(404, 'Failed to create workspace does not exist')
  }

  throw redirect(307, `/workspace/draft/${workspace.metadata.id}`)
}
