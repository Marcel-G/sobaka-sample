import { browser } from '$app/environment'
import { redirect } from '@sveltejs/kit'
import { init_repo } from '../../../../worker/ipfs'
import { init_user } from '../../../../worker/user'
import { save_draft } from '../../../../worker/state'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  await init_repo(init_user())

  const id = await save_draft()
  throw redirect(307, `/workspace/draft/${id}`)
}
