import { json, redirect } from '@sveltejs/kit'
import { create, load_workspace } from '../../../../worker/persistence'
import * as api from '../../../../server/api'
import type { PageLoad } from './$types'
import { browser, dev } from '$app/environment'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  if (!dev) {
    throw redirect(307, '/')
  }

  const id = event.params.slug

  const template = await load_workspace(id)

  if (template) {
    const new_id = await api.save(create(template))

    throw redirect(307, `/workspace/template/${new_id}/edit`)
  }

  return json({})
}
