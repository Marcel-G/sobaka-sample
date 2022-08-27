<script lang="ts">
  import { onDestroy } from 'svelte'
  import ModuleWrapper from '../modules/ModuleWrapper.svelte'
  import Toolbox from '../components/Toolbox.svelte'
  import Wires from '../components/Wires.svelte'
  import { patch_workspace } from '../worker/persistence'
  import { WorkspaceDocument } from '../worker/persistence'
  import { init_workspace } from './context'

  export let workspace_document: WorkspaceDocument

  let loading = false
  let toobox_visible = false
  let toolbox_position = { x: 0, y: 0 }
  let mouse_position = { x: 0, y: 0 }

  const space = init_workspace(workspace_document)

  const modules = space.list_modules()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handle_double_click = (_event: MouseEvent) => {
    toobox_visible = true
    toolbox_position = mouse_position
  }

  const handle_global_keydown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !toobox_visible) {
      toobox_visible = true
      toolbox_position = mouse_position
    }
  }

  const handle_mouse_move = (event: MouseEvent) => {
    mouse_position = { x: event.clientX, y: event.clientY }
  }

  const handle_close = () => {
    toobox_visible = false
  }

  const unsubscribe = space.subscribe_changes(change => {
    console.log(change)
    patch_workspace(space.id, change)
  })

  onDestroy(() => {
    unsubscribe()
  })
</script>

<svelte:window on:keydown={handle_global_keydown} />
<div
  class="workspace"
  on:click|self={handle_close}
  on:dblclick|self={handle_double_click}
  on:mousemove|self={handle_mouse_move}
>
  {#if loading}
    Loading
  {:else}
    {#if toobox_visible}
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
  }
</style>
