<script lang="ts">
  import { type Module } from '@sobaka/state/models/workspace'
  import { getWorkspace } from '../context/workspace'
  import { pluginRegistry } from '../plugins'

  export let module: Module
  export let disabled = false

  const { workspace, dsp, positions } = getWorkspace()

  const position = workspace.modulePosition(module.id)
  const layer = workspace.moduleLayer(module.id)
  const node = dsp.moduleNode(module.id)

  // Get component from plugin registry
  const component = pluginRegistry.getComponent(module.type)

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

  const handleBindElement = (element: HTMLElement) => {
    return positions.registerModule(module.id, element)
  }

  // Plug callbacks - get plug type and pass to tryMakeLink
  const handlePlugClick = (routeName: string) => {
    const plugType = dsp.getPlugType(module.id, routeName)
    if (plugType !== null) {
      workspace.tryMakeLink(module.id, routeName, plugType)
    }
  }

  const handleBindPlugElement = (routeName: string, element: HTMLElement) => {
    const linkPoint = { moduleId: module.id, routeName }
    return positions.registerPlug(linkPoint, element)
  }
</script>

{#if node && component}
  {@const nodeProps = {
    node,
    disabled,
    position,
    layer,
    onClose: handleClose,
    onClone: handleClone,
    onDrag: handleDrag,
    onPlugClick: handlePlugClick,
    bindElement: handleBindElement,
    bindPlugElement: handleBindPlugElement
  }}
  <svelte:component this={component} {...nodeProps} />
{/if}
