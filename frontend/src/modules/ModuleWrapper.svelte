<script context="module" lang="ts">
  import type { SobakaContext } from 'sobaka-sample-audio-worklet'
  export const MODULE_CONTEXT = 'MODULE_CONTEXT'

  export interface ModuleContext {
    id: string
    context: SobakaContext
    position: { x: number; y: number }
    get_sub_state: <T>(name: string) => T | undefined
    update_sub_state: <T>(name: string, state: T) => void
  }

  export const get_module_context = () => getContext<ModuleContext>(MODULE_CONTEXT)
</script>

<script lang="ts">
  import { merge, __ as _ } from 'lodash/fp'

  import { getContext, setContext } from 'svelte'

  import { get_component } from '.'
  import modules, { AnyModule } from '../state/modules'

  export let module: AnyModule
  export let context: SobakaContext

  const module_context: ModuleContext = {
    id: module.id,
    context,
    position: module.position,
    get_sub_state: function <T>(name: string): T | undefined {
      return module.state?.[name] as T
    },
    update_sub_state: function <T>(name: string, state: T): void {
      modules.update(module.id, merge(_, { [name]: state }))
    }
  }

  setContext(MODULE_CONTEXT, module_context)
</script>

<svelte:component this={get_component(module)} />
