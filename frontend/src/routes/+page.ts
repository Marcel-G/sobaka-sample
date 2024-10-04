import { browser } from '$app/environment'
import _ from 'lodash'
import { WorkspaceManager } from '../models/manager'
import { init_user } from '../models/user'
import type { PageLoad } from './$types'

export const prerender = true

export const load: PageLoad = async () => {
  if (!browser) {
    return {
      shared_with_drafts: [],
      orphan_drafts: []
    }
  }

  const manager = await WorkspaceManager.fromStorage(init_user())

  const workspaces = manager.listWorkspaces()
  //
  // // new drafts are documents without parents
  // const orphan_drafts = drafts.filter(
  //   draft => !draft.parent || !shared.find(remote => draft.parent === remote.cid)
  // )

  return {
    shared_with_drafts: [],
    orphan_drafts: workspaces.toArray().map(({ guid }) => ({ cid: guid }))
  }
}
