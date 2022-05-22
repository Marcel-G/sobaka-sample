<style>
  .panel {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -2px rgb(0 0 0 / 5%);
    border-radius: 0.5rem;
    background-color: var(--module-background);
    border: 2px solid var(--module-highlight);
    border-top-width: 1rem;
    padding: 0.5rem;

    cursor: move;

    user-select: none;

    touch-action: none;

    position: relative;
  }

  .bar {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;

    font-size: 0.75rem;

    padding-left: 0.25rem;

    height: 1rem;
    transform: translateY(-100%);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    pointer-events: none;
  }

  .close {
    font-family: monospace;
    border: 0;
    /* border-radius: 0.25rem; */
    background: var(--module-background);
    color: var(--module-foreground);
    line-height: 0;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;

    height: calc(1rem - 2px);
    width: 1.5rem;
    border-top-right-radius: 0.5rem;

    /* margin-right: -2px; */
    transition: opacity 0.125s;

    pointer-events: all;
  }

  .close:hover {
    opacity: 0.75;
  }

  .close:active {
    opacity: 0;
    color: var(--module-background);
  }

  .name {
    text-transform: uppercase;
    font-family: monospace;
    font-weight: bold;
    color: var(--background);
    mix-blend-mode: difference;

    overflow: hidden;
    text-overflow: ellipsis;
  }
  .inputs,
  .outputs {
    position: absolute;
    top: 0.5rem;
  }
  .inputs {
    left: 0;
    transform: translateX(-50%);
  }

  .outputs {
    right: 0;
    transform: translateX(50%);
  }
  .vertical {
    display: flex;
    flex-direction: column;
  }
</style>

<script context="module" lang="ts">
  export const into_grid_coords = (coords: {
    x: number
    y: number
  }): { x: number; y: number } => {
    const grid = 0.5 * 16 // grid is 0.5rem;
    const gap = 0.5 * 16 // grid is 0.5rem
    return {
      x: Math.round(coords.x / (grid + gap)),
      y: Math.round(coords.y / (grid + gap))
    }
  }
</script>

<script lang="ts">
  import modules from '../../state/modules'
  import { useDrag } from '../../actions/drag'
  import type { OnDrag } from '../../actions/drag'
  import { setContext } from 'svelte'
  import { get_module_context } from '../ModuleWrapper.svelte'

  export let custom_style: string = ''
  export let name: string
  export let height = 0
  export let width = 0

  let { position, id } = get_module_context()

  const moveContext = new EventTarget()
  setContext('move_context', moveContext)

  $: col = `${position.x + 1} / span ${width}`
  $: row = `${position.y + 1} / span ${height}`

  const onMove: OnDrag = (x_in, y_in, box) => {
    let { x, y } = into_grid_coords({ x: x_in, y: y_in })
    if (x < 0 || y < 0) {
      return
    }
    if (x !== box.x || y !== box.y) {
      const moved = modules.move(id, x, y)
      if (moved) {
        moveContext.dispatchEvent(new CustomEvent('move'))
        position = { x, y }
      }
    }
  }
</script>

<div
  use:useDrag={onMove}
  class="panel"
  style={`grid-column: ${col}; grid-row: ${row}; ${custom_style}`}
>
  <div class="bar">
    <span class="name">{name}</span>
    <button class="close" on:click={() => modules.remove(id)}>x</button>
  </div>
  <slot />
  <div class="inputs">
    <slot class="vertical" name="inputs" />
  </div>
  <div class="outputs">
    <slot class="vertical" name="outputs" />
  </div>
</div>
