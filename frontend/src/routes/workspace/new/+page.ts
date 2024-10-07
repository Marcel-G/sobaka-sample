import { browser } from '$app/environment'
import { redirect } from '@sveltejs/kit'
import { Workspace } from '../../../models/workspace'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  // TODO: add it to the list
  const workspace = Workspace.create()

  throw redirect(307, `/workspace/${workspace.id}`)
}
