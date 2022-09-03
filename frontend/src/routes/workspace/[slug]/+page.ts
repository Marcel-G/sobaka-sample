import { browser } from '$app/environment'
import { error, redirect } from '@sveltejs/kit'
import { create, load_workspace, save_workspace } from '../../../worker/persistence'
import type { PageLoad } from './$types'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  const id = event.params.slug
  if (id === 'new') {
    const new_id = await save_workspace(create())

    throw redirect(307, `/workspace/${new_id}`)
  } else {
    // Try load the workspace from localstorage
    const workspace = await load_workspace(id)
    if (!workspace) {
      throw error(404, 'Workspace does not exist')
    }
    return {
      workspace
    }
  }
}
