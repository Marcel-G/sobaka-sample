import { getContext, setContext } from 'svelte'

export const MODULE_CONTEXT = 'MODULE_CONTEXT'

export interface ModuleContext {
  id: string
}

export const get_module_context = () => getContext<ModuleContext>(MODULE_CONTEXT)

export const init_module_context = (module_id: string) => {
  // @todo -- put all module scoped method here
  const module_context: ModuleContext = {
    id: module_id
  }
  setContext(MODULE_CONTEXT, module_context)
}
