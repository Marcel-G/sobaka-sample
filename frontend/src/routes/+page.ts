import { browser } from '$app/environment'
import _ from 'lodash'
import { init_repo } from '../worker/ipfs'
import { list_local, list_remote } from '../worker/state'
import type { PageLoad } from './$types'

export const prerender = true

export const load: PageLoad = async () => {
  if (!browser) {
    return {
      shared_with_drafts: [],
      orphan_drafts: []
    }
  }

  // @todo -- reorganise this
  await init_repo()
  const shared = await list_remote()
  const drafts = await list_local()

  const shared_with_drafts = shared.map(remote => ({
    remote,
    drafts: drafts.filter(draft => draft.parent === remote.id)
  }))

  // new drafts are documents without parents
  const orphan_drafts = drafts.filter(
    draft => !draft.parent || !shared.find(remote => draft.parent === remote.id)
  )

  return {
    shared_with_drafts,
    orphan_drafts
  }
}
