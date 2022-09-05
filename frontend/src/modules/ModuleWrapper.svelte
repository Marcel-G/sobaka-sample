<script lang="ts">
  import { get_component } from '.'
  import { get_workspace } from '../workspace/context'
  import { init_module_context } from './context'

  export let module_id: string

  const space = get_workspace()
  const module = space.get_module_substore(module_id)
  const state = module.select(state => state.state)
  init_module_context(module_id)
</script>

<svelte:component this={get_component($module)} {state} />
