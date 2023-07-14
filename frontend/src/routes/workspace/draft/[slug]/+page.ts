import { browser } from '$app/environment'
import { error } from '@sveltejs/kit'
import { get_helia, init_repo } from '../../../../worker/ipfs'
import { init_user } from '../../../../worker/user'
import type { PageLoad } from './$types'
import { resolve_workspace } from '../../../../lib/YIpfsAdapter'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  await init_repo(init_user())

  try {
    const workspace = await resolve_workspace(get_helia(), event.params.slug);

    return {
      workspace: workspace
    }
  } catch (e) {
    throw error(404, 'Workspace does not exist')
  }
}
