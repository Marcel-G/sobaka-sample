import { browser } from '$app/environment'
import { redirect } from '@sveltejs/kit'
import { Root } from '../../../models/root'
import { Workspace } from '../../../models/workspace'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  const root = Root.init()
  const workspace = Workspace.create()
  await root.addToUserList(workspace)

  throw redirect(307, `/workspace/${workspace.id}`)
}
