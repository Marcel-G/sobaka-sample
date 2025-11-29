<script lang="ts">
  import { get_component } from '@sobaka/ui/modules'
  import { type Module } from '@sobaka/state/models/workspace'
  import { get_workspace } from '../context/workspace'

  export let module: Module
  export let disabled = false

  // Get workspace context from the app
  const { workspace } = get_workspace()
  
  const position = workspace.module_position(module.id)

  const component = get_component(module)
</script>

<svelte:component 
  moduleId={module.id}
  this={component} 
  state={module.state as any} 
  {disabled}
  {position}
  workspace={workspace}
/>
