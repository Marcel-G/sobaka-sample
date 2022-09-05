import { error, json, redirect } from '@sveltejs/kit'
import { create, save_workspace } from '../../../../worker/persistence'
import * as api from '../../../../server/api'
import type { PageLoad } from './$types'
import { browser } from '$app/environment'

export const load: PageLoad = async event => {
  if (!browser) throw new Error('Load cannot be run outside of the browser')

  const id = event.params.slug

  const template = await api.load(id)

  if (template) {
    const new_id = await save_workspace(create(template))

    throw redirect(307, `/workspace/${new_id}`)
  }

  throw error(404, 'Template does not exist')
}
