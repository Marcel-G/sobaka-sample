import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async event => {
  const id = event.params.slug

  return {
    workspace: { id }
  }
}
