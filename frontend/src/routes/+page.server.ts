/*
  Dumb server
  will only work in development for now for creating examples
*/

import _ from 'lodash'
import type { PageLoad } from '../../.svelte-kit/types/src/routes/$types'
import * as dumb_server from '../server/dumb_server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const load: PageLoad = async event => {
  const templates = await dumb_server.list()

  return {
    templates: _.orderBy(templates, 'modifiedAt', 'desc')
  }
}
