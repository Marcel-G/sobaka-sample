<script context="module" lang="ts">
  import { type Position } from '../@types'
  export const mouse_position = writable<Position>({ x: 0, y: 0 })
</script>

<script lang="ts">
  import { writable } from 'svelte/store'

  import ModuleWrapper from '../modules/ModuleWrapper.svelte'
  import Toolbox from '../components/Toolbox.svelte'
  import Wires from '../components/Wires.svelte'
  import { get_workspace } from '../context/workspace'
  import AvatarList from '../components/collaborative/AvatarList.svelte'
  import Mixer from '../modules/Mixer.svelte'

  let toolbox_visible = false
  let toolbox_position: Position = { x: 0, y: 0 }
  let workspace_element: Element

  const { workspace } = get_workspace()
  const modules = workspace.modules
  const isEditable = workspace.isEditable

  const handle_double_click = (event: MouseEvent) => {
    if (!$isEditable) return
    $mouse_position = { x: event.offsetX, y: event.offsetY }
    toolbox_visible = true
    toolbox_position = $mouse_position
  }

  const handle_global_keydown = (event: KeyboardEvent) => {
    if (!$isEditable) return
    if (event.code === 'Space' && !toolbox_visible) {
      event.preventDefault()
      toolbox_visible = true
      toolbox_position = $mouse_position
    } else if (event.code === 'Escape') {
      workspace.pending_link_store.update(() => null)
    }
  }

  const handle_mouse_move = (event: MouseEvent) => {
    const rect = workspace_element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    $mouse_position = { x, y }
  }

  const handle_close = () => {
    toolbox_visible = false
  }
</script>

<svelte:window
  on:keydown={handle_global_keydown}
  on:wheel={handle_mouse_move}
  on:mousemove={handle_mouse_move}
/>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  role="menu"
  tabindex="0"
  data-kind="workspace"
  class="workspace"
  class:editable={$isEditable}
  on:click|self={handle_close}
  on:dblclick|self={handle_double_click}
  bind:this={workspace_element}
>
  <AvatarList />
  <Mixer />
  {#if toolbox_visible}
    <Toolbox position={toolbox_position} onClose={handle_close} />
  {/if}

  {#each $modules as module (module.id)}
    <ModuleWrapper {module} disabled={!$isEditable} />
  {/each}
  <Wires {mouse_position} />
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
