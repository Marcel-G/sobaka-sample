import { browser } from '$app/environment'
import _ from 'lodash'
import type { PageLoad } from './$types'
import { get_storage } from '../worker/storage'

export const prerender = true

export const load: PageLoad = async () => {
  if (!browser) {
    return {
      shared_with_drafts: [],
      orphan_drafts: []
    }
  }

  const storage = await get_storage()
  const collection = await storage.get_collection(storage.get_client_id())

  return {
    collection
  }
}
