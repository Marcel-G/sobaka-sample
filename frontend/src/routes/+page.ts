import { orderBy } from 'lodash'
import { clean_db, list_workspaces } from '../worker/persistence'
import type { PageLoad } from './$types'

// `event` is used here due to https://github.com/sveltejs/kit/issues/5927
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const load: PageLoad = async event => {
  await clean_db() // Maybe there is a better place for this
  const workspaces = await list_workspaces()

  return {
    workspaces: orderBy(workspaces, 'modifiedAt', 'desc')
  }
}
