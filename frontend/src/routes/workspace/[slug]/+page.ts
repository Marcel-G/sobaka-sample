import { error, redirect } from '@sveltejs/kit'
import { load_workspace, new_workspace } from '../../../worker/persistence'
import type { PageLoad } from './$types'

export const load: PageLoad = async event => {
  const id = event.params.slug
  if (id === 'new') {
    const new_id = await new_workspace()

    // > There is a known bug with `redirect`: it will currently fail during client-side navigation, due to [#5952](https://github.com/sveltejs/kit/issues/5952)
    // At least in dev mode
    console.log(`/workspace/${new_id}`)
    throw redirect(307, `/workspace/${new_id}`)
  } else {
    // Try load the workspace from localstorage
    const workspace = await load_workspace(id)
    if (!workspace) {
      throw error(404, "Sorry, couldn't find that workspace.")
    }
    return {
      workspace
    }
  }
}
