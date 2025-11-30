<script lang="ts">
  import { get_component } from '@sobaka/ui/modules'
  import { type Module } from '@sobaka/state/models/workspace'
  import { get_workspace } from '../context/workspace'

  export let module: Module
  export let disabled = false

  const { workspace, dsp, positions } = get_workspace()
  
  const position = workspace.module_position(module.id)
  const node = dsp.moduleNode(module.id)

  const component = get_component(module)
  
  // Callback handlers - bridge between dumb UI and smart workspace
  const handleClose = (id: string) => {
    workspace.remove_module(id)
  }
  
  const handleClone = (id: string) => {
    workspace.clone_module(id)
  }
  
  const handleDrag = (id: string, x: number, y: number) => {
    workspace.move_module(id, x, y)
  }
  
  const handlePlugClick = (moduleId: string, routeName: string) => {
    workspace.try_make_link(moduleId, routeName)
  }
  
  const handleRegisterElement = (id: string, element: HTMLElement) => {
    positions.registerModule(id, element)
  }
  
  const handleUnregisterElement = (id: string) => {
    positions.removeModule(id)
  }
</script>

<svelte:component 
  this={component}
  {node}
  {disabled}
  moduleId={module.id}
  {position}
  onClose={handleClose}
  onClone={handleClone}
  onDrag={handleDrag}
  onPlugClick={handlePlugClick}
  registerElement={handleRegisterElement}
  unregisterElement={handleUnregisterElement}
/>
