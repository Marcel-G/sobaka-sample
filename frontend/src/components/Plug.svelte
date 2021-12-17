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
  import type { InputTypeDTO } from 'sobaka-sample-web-audio'
  import { getContext, onDestroy } from 'svelte'
  import { get, writable, Writable } from 'svelte/store'
  import links, { Link } from '../state/links'

  export let id: string
  export let label: string
  export let to_type: InputTypeDTO | null = null

  const move_context: EventTarget = getContext('move_context')

  const is_fully_linked = (link: Partial<Link> | null): link is Link => {
    return Boolean(link?.from && link?.to && link?.to_input_type)
  }

  const active_link = links.active_link_store()
  export const el: Writable<Element> = writable()

  function handle_click() {
    if (to_type === null) {
      active_link.update(link => ({
        ...(link || {}),
        from: id
      }))
    } else {
      active_link.update(link => ({
        ...(link || {}),
        to: id,
        to_input_type: to_type!
      }))
    }

    const link = get(active_link)

    if (is_fully_linked(link)) {
      links.add(link)
      active_link.set(null)
    }
  }

  function on_move() {
    el.update(element => element)
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
  bind:this={$el}
/>
