<style>
  .plug {
    cursor: pointer;
    width: 0.75rem;
    height: 0.75rem;
    margin: 0.25rem;
    background-color: white;
    border: 3px solid pink;

    border-radius: 50%;
  }
</style>

<script lang="ts">
  import type { AnyInput } from 'sobaka-sample-web-audio'
  import { getContext, onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import plug from '../state/plug'

  export let id: string
  export let label: string
  export let for_input: AnyInput | null = null

  const move_context: EventTarget = getContext('move_context')

  const node: Writable<Element> = writable()

  plug.register(id, for_input, node)

  function handle_click() {
    plug.make(id, for_input)
  }

  function on_move() {
    node.update(element => element)
  }

  move_context.addEventListener('move', on_move)

  onDestroy(() => {
    move_context.removeEventListener('move', on_move)
  })
</script>

<div
  role="button"
  aria-label={label}
  class="plug"
  on:click={() => handle_click()}
  bind:this={$node}
/>
