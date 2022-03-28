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

  .navigation {
    background-color: var(--current-line);
    width: 100vw;
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 100;
  }

  .navigation ul {
    display: flex;
    justify-content: flex-end;
    list-style-type: none;
  }

  .navigation button {
    background-color: var(--purple-dark);
    color: var(--foreground);
    padding: 0.5rem;
    margin: 0.5rem;
    border-radius: 0.25rem;

    font-family: monospace;

    transition: background-color 0.25s;

    cursor: pointer;
  }

  .navigation button:hover {
    background-color: var(--purple);
  }
</style>

<script lang="ts">
  import { onDestroy } from 'svelte'
  import { Link, navigate } from 'svelte-routing'

  import { init } from '../state/global'
  import Toolbox from './Toolbox.svelte'

  const { persistant, cleanup, set_current_id } = init()

  let loading = true
  let toobox_visible = false
  let toolbox_position = { x: 0, y: 0 }
  let mouse_position = { x: 0, y: 0 }

  export let id: string

  $: set_current_id(id)
  $: {
    persistant.load(id).then(loaded => {
      if (!loaded) {
        console.error('Cannot load from file')
      } else {
        console.log('loading from file')
      }
      loading = false
    })
  }

  const handle_fork = () => {
    persistant.save().then(new_id => {
      if (new_id) {
        set_current_id(new_id)
        navigate(`/workspace/${new_id}`)
        loading = false
      }
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
<nav class="navigation">
  <ul>
    <li>
      <Link to="/workspace/new">
        <button>New</button>
      </Link>
    </li>
    <li>
      <button on:click={handle_fork}> Fork </button>
    </li>
    <ul />
  </ul>
</nav>
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
