import { browser } from '$app/environment'
import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { peerIdFromString } from '@libp2p/peer-id'
import { get_storage } from '../../../../worker/storage'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  try {
    const id = peerIdFromString(event.params.slug)
    const storage = await get_storage()
    const workspace = await storage.get_workspace(id)
    return { workspace }
  } catch (e) {
    console.error(e);
    throw error(404, 'Workspace does not exist')
  }
}
