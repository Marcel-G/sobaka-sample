<script lang="ts">
  import { getComponent } from '@sobaka/ui/modules'
  import { type Module } from '@sobaka/state/models/workspace'
  import { getWorkspace } from '../context/workspace'

  export let module: Module
  export let disabled = false

  const { workspace, dsp, positions } = getWorkspace()
  
  const position = workspace.modulePosition(module.id)
  const node = dsp.moduleNode(module.id)

  const component = getComponent(module)
  
  // Callback handlers - bridge between dumb UI and smart workspace
  // Panel callbacks - these already know the moduleId from closure
  const handleClose = () => {
    workspace.removeModule(module.id)
  }
  
  const handleClone = () => {
    workspace.cloneModule(module.id)
  }
  
  const handleDrag = (x: number, y: number) => {
    workspace.moveModule(module.id, x, y)
  }
  
  const handleRegisterElement = (element: HTMLElement) => {
    positions.registerModule(module.id, element)
  }
  
  const handleUnregisterElement = () => {
    positions.removeModule(module.id)
  }
  
  // Plug callbacks - map routeName to full linkPoint
  const handlePlugClick = (routeName: string) => {
    workspace.tryMakeLink(module.id, routeName)
  }
  
  const handleRegisterPlugElement = (routeName: string, element: HTMLElement) => {
    const linkPoint = { moduleId: module.id, routeName }
    positions.registerPlug(linkPoint, element)
  }
  
  const handleUnregisterPlugElement = (routeName: string) => {
    const linkPoint = { moduleId: module.id, routeName }
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
