/*
  Dumb server
  will only work in development for now for creating examples
*/

import { error } from '@sveltejs/kit'
import * as dumb_server from '../../../../../server/dumb_server'
import type { PageLoad, Action } from './$types'

export const load: PageLoad = async event => {
  const id = event.params.slug

  const workspace = await dumb_server.load(id)

  if (!workspace) {
    throw error(404, 'Template does not exist')
  } else {
    return {
      workspace
    }
  }
}

export const POST: Action = async ({ request }) => {
  const response = await request.json()
  // @todo validate json

  dumb_server.save(response.id, response)
}

export const PATCH: Action = async ({ request }) => {
  const response = await request.json()
  // @todo validate json

  dumb_server.patch(response.id, response.changes)
}
