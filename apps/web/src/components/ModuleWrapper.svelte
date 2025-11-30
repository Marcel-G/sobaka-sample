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
  // Panel callbacks - these already know the moduleId from closure
  const handleClose = () => {
    workspace.remove_module(module.id)
  }
  
  const handleClone = () => {
    workspace.clone_module(module.id)
  }
  
  const handleDrag = (x: number, y: number) => {
    workspace.move_module(module.id, x, y)
  }
  
  const handleRegisterElement = (element: HTMLElement) => {
    positions.registerModule(module.id, element)
  }
  
  const handleUnregisterElement = () => {
    positions.removeModule(module.id)
  }
  
  // Plug callbacks - map routeName to full linkPoint
  const handlePlugClick = (routeName: string) => {
    workspace.try_make_link(module.id, routeName)
  }
  
  const handleRegisterPlugElement = (routeName: string, element: HTMLElement) => {
    const linkPoint = `${module.id}/${routeName}`
    positions.registerPlug(linkPoint, element)
  }
  
  const handleUnregisterPlugElement = (routeName: string) => {
    const linkPoint = `${module.id}/${routeName}`
    positions.removePlug(linkPoint)
  }
</script>

<svelte:component 
  this={component}
  {node}
  {disabled}
  {position}
  onClose={handleClose}
  onClone={handleClone}
  onDrag={handleDrag}
  onPlugClick={handlePlugClick}
  registerElement={handleRegisterElement}
  unregisterElement={handleUnregisterElement}
  registerPlugElement={handleRegisterPlugElement}
  unregisterPlugElement={handleUnregisterPlugElement}
/>
