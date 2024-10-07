<script lang="ts">
  import { get_component } from '.'
  import { Module } from '../models/workspace'
  import { init_module_context } from './context'

  export let module: Module

  init_module_context(module.id)
</script>

<svelte:component this={get_component(module)} state={module.state} />
