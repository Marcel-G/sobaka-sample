<style>
  .plug {
    cursor: pointer;
    width: 0.625rem;
    height: 0.625rem;
    background-color: white;
    border: 2px solid pink;

    border-radius: 50%;
  }
</style>

<script lang="ts">
  import type { AbstractNode, AnyInput, NodeType } from 'sobaka-sample-audio-worklet'
  import { getContext, onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import plug from '../../state/plug'
  import { get_module_context } from '../ModuleWrapper.svelte'

  const { id } = get_module_context()

  export let for_node: AbstractNode<NodeType>
  export let for_input: AnyInput | undefined = undefined
  export let name: string = for_input || 'output'
  export let label: string = name

  const move_context: EventTarget = getContext('move_context')

  const node: Writable<Element> = writable()

  plug.register(id, name, for_node, node, for_input)

  function handle_click() {
    plug.make(id, name)
  }

  function on_move() {
    node.update(element => element)
  }

  move_context.addEventListener('move', on_move)

  onDestroy(() => {
    plug.remove(id, name)
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
