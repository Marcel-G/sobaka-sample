import { browser } from '$app/environment'
import { error } from '@sveltejs/kit'
import { validate_cid } from '../../../worker/state'
import type { PageLoad } from './$types'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  const id = event.params.slug
  if (!(await validate_cid(id))) {
    throw error(404, 'Workspace does not exist')
  }

  return {
    workspace: { id }
  }
}
