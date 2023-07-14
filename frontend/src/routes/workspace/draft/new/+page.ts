import { browser } from '$app/environment'
import { redirect } from '@sveltejs/kit'
import { get_helia, init_repo } from '../../../../worker/ipfs'
import { init_user } from '../../../../worker/user'
import type { PageLoad } from './$types'
import { create_workspace } from '../../../../lib/YIpfsAdapter'

export const load: PageLoad = async () => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  await init_repo(init_user())

  const id = await create_workspace(get_helia())
  throw redirect(307, `/workspace/draft/${id}`)
}
