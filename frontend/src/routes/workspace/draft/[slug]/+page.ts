import { browser } from '$app/environment'
import type { PageLoad } from './$types'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  const id = event.params.slug

  return {
    workspace: { id }
  }
}
