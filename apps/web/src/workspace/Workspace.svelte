<script context="module" lang="ts">
  export const mousePosition = writable<Position>({ x: 0, y: 0 })
</script>

<script lang="ts">
  import { writable } from 'svelte/store'
  import { onDestroy } from 'svelte'

  import ModuleWrapper from '../components/ModuleWrapper.svelte'
  import StaticModuleWrapper from '../components/StaticModuleWrapper.svelte'
  import Toolbox from '../components/Toolbox.svelte'
  import Wires from '../components/Wires.svelte'
  import { getWorkspace } from '../context/workspace'
  import AvatarList from '../components/collaborative/AvatarList.svelte'
  import type { Position } from '@sobaka/state'
  import { isPartialLink } from '../context/linkFinder'

  let toolboxVisible = false
  let toolboxPosition: Position = { x: 0, y: 0 }
  let workspaceElement: Element

  const { workspace, positions } = getWorkspace()
  const modules = workspace.modules
  const isEditable = workspace.isEditable
  const partialLink = workspace.pendingLinkStore

  // Clean up position observers and RAF when workspace is destroyed
  onDestroy(() => {
    positions.destroy()
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  })

  const handleDoubleClick = (event: MouseEvent) => {
    if (!$isEditable) return
    $mousePosition = { x: event.offsetX, y: event.offsetY }
    toolboxVisible = true
    toolboxPosition = $mousePosition
  }

  const handleGlobalKeydown = (event: KeyboardEvent) => {
    if (!$isEditable) return
    if (event.code === 'Space' && !toolboxVisible) {
      event.preventDefault()
      toolboxVisible = true
      toolboxPosition = $mousePosition
    } else if (event.code === 'Escape') {
      workspace.pendingLinkStore.update(() => null)
    }
  }

  // Track latest mouse position but only update store when needed
  let latestMouseX = 0
  let latestMouseY = 0
  let rafId: number | null = null

  const handleMousePositionChange = (event: MouseEvent) => {
    if (isPartialLink($partialLink)) {
      const rect = workspaceElement.getBoundingClientRect()
      latestMouseX = event.clientX - rect.left
      latestMouseY = event.clientY - rect.top
      if (rafId !== null) { cancelAnimationFrame(rafId) }
      rafId = requestAnimationFrame(() => {
        $mousePosition = { x: latestMouseX, y: latestMouseY }
        rafId = null
      })
    }
  }

  const handleClose = () => {
    toolboxVisible = false
  }
</script>

<svelte:window
  on:keydown={handleGlobalKeydown}
  on:wheel={handleMousePositionChange}
  on:mousemove={handleMousePositionChange}
/>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  role="menu"
  tabindex="0"
  data-kind="workspace"
  class="workspace"
  class:editable={$isEditable}
  on:click|self={handleClose}
  on:dblclick|self={handleDoubleClick}
  bind:this={workspaceElement}
>
  <AvatarList />
  <StaticModuleWrapper moduleId="global-mixer" moduleType="Mixer" />
  {#if toolboxVisible}
    <Toolbox position={toolboxPosition} onClose={handleClose} />
  {/if}

  {#each $modules as module (module.id)}
    <ModuleWrapper {module} disabled={!$isEditable} />
  {/each}
  <Wires {mousePosition} />
</div>

<style lang="postcss">
  .workspace {
    display: grid;
    grid-auto-rows: 0.5rem;
    grid-auto-columns: 0.5rem;
    gap: 0.5rem;
    min-width: max-content;
    min-height: 100vh;
    position: relative;

    padding-right: 5rem;
    padding-bottom: 5rem;
  }

  .editable {
    background: conic-gradient(from 90deg at 1px 1px, #0000 90deg, var(--color-dark) 0) 0
      0 / 1rem 1rem;
  }
</style>
