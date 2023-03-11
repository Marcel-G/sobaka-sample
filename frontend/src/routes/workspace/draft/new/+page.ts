import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
  const new_workspace = crypto.randomUUID()
  throw redirect(307, `/workspace/draft/${new_workspace}`)
}
