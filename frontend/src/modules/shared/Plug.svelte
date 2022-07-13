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

  .wrapper {
    position: relative;
    font-family: monospace;
    text-transform: lowercase;
  }

  .wrapper .tooltip {
    visibility: hidden;
    max-width: 120px;
    background-color: var(--current-line);
    color: var(--foreground);
    text-align: center;
    border-radius: 0.5rem;
    padding: 0.5rem;
    position: absolute;
    z-index: 1;
    top: 50%;
  }

  .tooltip {
    pointer-events: none;
  }
  .tooltip.left {
    right: 100%;
    transform: translate(-0.25rem, -50%);
  }
  .tooltip.left::after {
    left: 100%;
    border-color: transparent transparent transparent var(--current-line);
  }

  .tooltip.right {
    left: 100%;
    transform: translate(0.25rem, -50%);
  }
  .tooltip.right::after {
    right: 100%;
    border-color: transparent var(--current-line) transparent transparent;
  }

  .wrapper .tooltip::after {
    content: '';
    position: absolute;
    top: 50%;
    margin-top: -5px;
    border-width: 5px;
    border-style: solid;
  }
  .wrapper:hover .tooltip {
    visibility: visible;
  }
</style>

<script lang="ts">
  import type { AbstractModule, NodeType } from 'sobaka-sample-audio-worklet'
  import { getContext, onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import plug, { PlugType } from '../../state/plug'
  import { get_module_context } from '../ModuleWrapper.svelte'

  const { id: module_id } = get_module_context()

  export let for_module: AbstractModule<NodeType>
  export let type: PlugType
  export let id: number
  export let label: string

  const move_context: EventTarget = getContext('move_context')

  const node: Writable<Element> = writable()

  plug.register(module_id, for_module, node, type, id)

  function handle_click() {
    plug.make(module_id, type, id)
  }

  function on_move() {
    node.update(element => element)
  }

  move_context.addEventListener('move', on_move)

  onDestroy(() => {
    plug.remove(module_id, type, id)
    move_context.removeEventListener('move', on_move)
  })
</script>

<div class="wrapper">
  <div
    role="button"
    aria-label={label}
    class="plug"
    on:click={() => handle_click()}
    bind:this={$node}
  />
  <span
    class:left={type === PlugType.Input}
    class:right={type === PlugType.Output}
    class="tooltip left"
  >
    {label}
  </span>
</div>
