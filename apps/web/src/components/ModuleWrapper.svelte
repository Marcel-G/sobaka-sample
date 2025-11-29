<script lang="ts">
  import { get_component } from '@sobaka/ui/modules'
  import { type Module } from '@sobaka/state/models/workspace'
  import { get_workspace } from '../context/workspace'
  import { writable } from 'svelte/store'

  export let module: Module
  export let disabled = false

  // Get workspace context from the app
  const { workspace, positions } = get_workspace()
  
  const position = workspace.module_position(module.id)

  const component = get_component(module)
</script>

<svelte:component 
  this={component} 
  state={module.state as any} 
  {disabled}
  moduleId={module.id}
  {position}
  workspace={{
    module_position: (id: string) => workspace.module_position(id),
    move_module: (id: string, x: number, y: number) => workspace.move_module(id, x, y),
    clone_module: (id: string) => workspace.clone_module(id),
    remove_module: (id: string) => workspace.remove_module(id),
    try_make_link: (plugId: string) => workspace.try_make_link(plugId),
    register_plug: (id: string, ctx: any) => workspace.register_plug(id, ctx),
    remove_plug: (id: string) => workspace.remove_plug(id),
    positions
  }}
/>
