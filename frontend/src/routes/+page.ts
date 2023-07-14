import { browser } from '$app/environment'
import _ from 'lodash'
import { init_user } from '../worker/user'
import { init_repo } from '../worker/ipfs'
// import { list_local, list_remote } from '../worker/state'
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
  await init_repo(init_user())
  // const shared = await list_remote()
  // const drafts = await list_local()
  const shared = []
  const drafts = []

  const shared_with_drafts = shared.map(remote => ({
    remote,
    drafts: drafts.filter(draft => draft.parent === remote.cid)
  }))

  // new drafts are documents without parents
  const orphan_drafts = drafts.filter(
    draft => !draft.parent || !shared.find(remote => draft.parent === remote.cid)
  )

  return {
    shared_with_drafts,
    orphan_drafts
  }
}
