<script context="module" lang="ts">
  import { Position } from '../@types'
  export const mouse_position = writable<Position>({ x: 0, y: 0 })
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'
  import ModuleWrapper from '../modules/ModuleWrapper.svelte'
  import Toolbox from '../components/Toolbox.svelte'
  import Wires from '../components/Wires.svelte'
  import { patch_workspace } from '../worker/persistence'
  import { WorkspaceDocument } from '../worker/persistence'
  import { init_workspace } from './context'
  import { writable } from 'svelte/store'
  import { page } from '$app/stores'
  import { title } from '../components/Navigation.svelte'
  import * as api from '../server/api'

  export let workspace_document: WorkspaceDocument

  let loading = false
  let toolbox_visible = false
  let toolbox_position: Position = { x: 0, y: 0 }
  let workspace_element: Element

  const space = init_workspace(workspace_document)

  const modules = space.list_modules()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handle_double_click = (_event: MouseEvent) => {
    toolbox_visible = true
    toolbox_position = $mouse_position
  }

  const handle_global_keydown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !toolbox_visible) {
      toolbox_visible = true
      toolbox_position = $mouse_position
    } else if (event.code === 'Escape') {
      const active_link = space.get_active_link_substore()
      active_link.update(() => null)
    }
  }

  const handle_mouse_move = (event: MouseEvent) => {
    if (event.target instanceof HTMLElement) {
      const rect = workspace_element.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      $mouse_position = { x, y }
    }
  }

  const handle_close = () => {
    toolbox_visible = false
  }

  // Set UI page title on load
  title.update(() => workspace_document.title)
  // Update page title state when it's edited
  $: space.update_title($title)

  // Subscribe to any workspace changes
  const unsubscribe = space.subscribe_changes(change => {
    if ($page.routeId?.includes('template') && $page.routeId?.includes('edit')) {
      void api.patch(space.id, change)
    } else {
      patch_workspace(space.id, change)
    }
  })

  onDestroy(() => {
    unsubscribe()
  })
</script>

<svelte:window on:keydown={handle_global_keydown} on:mousemove={handle_mouse_move} />
<div
  class="workspace"
  on:click|self={handle_close}
  on:dblclick|self={handle_double_click}
  bind:this={workspace_element}
>
  {#if loading}
    Loading
  {:else}
    {#if toolbox_visible}
      <Toolbox position={toolbox_position} onClose={handle_close} />
    {/if}

    {#each $modules as module_id (module_id)}
      <ModuleWrapper {module_id} />
    {/each}
    <Wires />
  {/if}
</div>

<style>
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

    background: conic-gradient(from 90deg at 1px 1px, #0000 90deg, var(--current-line) 0)
      0 0 / 1rem 1rem;
  }
</style>
