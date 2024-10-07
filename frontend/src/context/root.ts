import { getContext, setContext } from 'svelte'
import { Root } from '../models/root'

const ROOT_CONTEXT = 'ROOT_CONTEXT'

export const get_root = () => getContext<Root>(ROOT_CONTEXT)
export const init_root = () => {
  const ctx = Root.init()
  setContext(ROOT_CONTEXT, ctx)
  return ctx
}
