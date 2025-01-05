<script lang="ts">
  import { get_component } from '.'
  import { type Module } from '../models/workspace'
  import { init_module_context } from './context'

  export let module: Module
  export let disabled = false

  init_module_context(module.id)
</script>

<svelte:component this={get_component(module)} state={module.state} {disabled} />
