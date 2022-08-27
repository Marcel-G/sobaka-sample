<script lang="ts">
  import type { AbstractModule, NodeType } from 'sobaka-sample-audio-worklet'
  import { getContext, onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import context, { PlugType } from '../../workspace/plugs'
  import Tooltip from '../../components/Tooltip.svelte'
  import { get_workspace } from '../../workspace/context'
  import { get_module_context } from '../context'

  const space = get_workspace()
  const { id: module_id } = get_module_context()

  export let for_module: AbstractModule<NodeType>
  export let type: PlugType
  export let id: number
  export let label: string

  const move_context: EventTarget = getContext('move_context')

  const node: Writable<Element | null> = writable(null)

  $: if (for_module) {
    // Register once module is defined
    context.register(module_id, for_module, node, type, id)
  }

  function handle_click() {
    context.make(space, module_id, type, id)
  }

  function on_move() {
    node.update(element => element)
  }

  move_context.addEventListener('move', on_move)

  onDestroy(() => {
    context.remove(space, module_id, type, id)
    move_context.removeEventListener('move', on_move)
  })
</script>

<Tooltip {label} position={type === PlugType.Input ? 'left' : 'right'}>
  <div
    role="button"
    aria-label={label}
    class="plug"
    on:click={() => handle_click()}
    bind:this={$node}
  />
</Tooltip>

<style>
  .plug {
    cursor: pointer;
    width: 0.8rem;
    height: 0.8rem;
    background-color: var(--background);
    border: 2px solid var(--module-highlight);

    transition: border-color 0.25s;

    border-radius: 50%;
  }

  .plug:hover {
    border-color: var(--foreground);
  }
</style>
