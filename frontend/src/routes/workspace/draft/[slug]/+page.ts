import { browser } from '$app/environment'
import { error } from '@sveltejs/kit'
import { init_repo } from '../../../../worker/ipfs'
import { resolve_draft_id } from '../../../../worker/state'
import { init_user } from '../../../../worker/user'
import type { PageLoad } from './$types'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  await init_repo(init_user())

  const id = await resolve_draft_id(event.params.slug)
  if (!id) {
    throw error(404, 'Workspace does not exist')
  }

  return {
    workspace: { id }
  }
}
