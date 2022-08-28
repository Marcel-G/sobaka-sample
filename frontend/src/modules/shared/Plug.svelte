<script lang="ts">
  import type { AbstractModule, NodeType } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { writable, Writable } from 'svelte/store'
  import context, { PlugType } from '../../workspace/plugs'
  import Tooltip from '../../components/Tooltip.svelte'
  import { get_workspace } from '../../workspace/context'
  import { get_module_context } from '../context'

  const space = get_workspace()
  const { id: module_id } = get_module_context()
  const module = space.get_module_substore(module_id)
  const position = module.select(state => state.position)

  export let for_module: AbstractModule<NodeType>
  export let type: PlugType
  export let id: number
  export let label: string

  const node: Writable<Element | null> = writable(null)

  $: if (for_module) {
    // Register once module is defined
    context.register(module_id, for_module, node, type, id)
  }

  function handle_click() {
    context.make(space, module_id, type, id)
  }

  function on_move() {
    requestAnimationFrame(() => {
      // Trigger a state update so that dependencies re-calculate the new position
      node.update(plug_element => plug_element)
    })
  }

  const cleanup = position.subscribe(on_move)

  onDestroy(() => {
    cleanup()
    context.remove(space, module_id, type, id)
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
