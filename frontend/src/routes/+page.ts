import { browser } from '$app/environment'
import _ from 'lodash'
import { clean_db, list_workspaces } from '../worker/persistence'
import type { PageLoad } from './$types'

export const prerender = true

// `event` is used here due to https://github.com/sveltejs/kit/issues/5927
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const load: PageLoad = async ({ data }) => {
  const { templates } = data
  if (!browser) {
    return {
      templates,
      workspaces: []
    }
  }

  await clean_db() // Maybe there is a better place for this
  const workspaces = await list_workspaces()

  return {
    templates,
    workspaces: _.orderBy(workspaces, 'modifiedAt', 'desc')
  }
}
