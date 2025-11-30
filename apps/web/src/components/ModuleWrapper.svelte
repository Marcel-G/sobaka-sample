<script lang="ts">
  import { get_component } from '@sobaka/ui/modules'
  import { type Module } from '@sobaka/state/models/workspace'
  import { get_workspace } from '../context/workspace'

  export let module: Module
  export let disabled = false

  const { workspace, dsp } = get_workspace()
  
  const position = workspace.module_position(module.id)
  const node = dsp.moduleNode(module.id)

  const component = get_component(module)
</script>

<svelte:component 
  node={node}
  moduleId={module.id}
  this={component}
  {disabled}
  {position}
  workspace={workspace}
/>
