<svelte:options immutable={true} />

<script lang="ts">
  import { Module } from '../workspace/state'
  import { get_component } from '.'
  import { init_module_context } from './context'

  export let module: Module

  init_module_context(module.id)
</script>

<svelte:component this={get_component(module)} state={module.state} />
