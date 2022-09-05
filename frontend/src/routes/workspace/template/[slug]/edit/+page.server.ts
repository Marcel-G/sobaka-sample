/*
  Dumb server
  will only work in development for now for creating examples
*/

import { dev } from '$app/environment'
import { error, redirect } from '@sveltejs/kit'
import * as dumb_server from '../../../../../server/dumb_server'
import type { PageLoad, Action } from './$types'

export const load: PageLoad = async event => {
  const id = event.params.slug

  if (!dev) {
    throw redirect(307, '/')
  }

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

export const DELETE: Action = async ({ request }) => {
  const response = await request.json()
  // @todo validate json

  await dumb_server.destroy(response.id)
}
