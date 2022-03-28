<style>
  .workspace {
    display: grid;
    grid-template-columns: repeat(auto-fill, 0.5rem);
    grid-template-rows: repeat(auto-fill, 0.5rem);
    position: fixed;
    inset: 0;
    gap: 0.5rem;
  }
</style>

<script lang="ts">
  import { onDestroy } from 'svelte'

  import { init } from '../state/global'
  import Toolbox from './Toolbox.svelte'

  const { persistant, cleanup, set_current_id } = init()

  let loading = true
  let toobox_visible = false
  let toolbox_position = { x: 0, y: 0 }
  let mouse_position = { x: 0, y: 0 }

  export let id: string

  $: set_current_id(id)

  $: if (id == 'new') {
    persistant.save().then(new_id => {
      if (new_id) {
        set_current_id(new_id)
        history.pushState({}, '', `/workspace/${new_id}`)
        loading = false
      }
    })
  } else {
    persistant.load(id).then(loaded => {
      if (!loaded) {
        console.error('Cannot load from file')
      } else {
        console.log('loading from file')
      }
      loading = false
    })
  }

  const handle_double_click = (event: MouseEvent) => {
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

  onDestroy(cleanup)
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
    <slot />
  {/if}
</div>
