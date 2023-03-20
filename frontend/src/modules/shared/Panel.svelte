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
  import { useDrag } from '../../actions/drag'
  import type { OnDrag } from '../../actions/drag'
  import { get_workspace } from '../../workspace/context'
  import { get_module_context } from '../context'

  export let custom_style = ''
  export let name: string
  export let height = 0
  export let width = 0

  const space = get_workspace()
  const { id } = get_module_context()

  const position = space.module_position(id)

  $: col = `${$position.x + 1} / span ${width}`
  $: row = `${$position.y + 1} / span ${height}`

  const onMove: OnDrag = (x_in, y_in) => {
    let { x, y } = into_grid_coords({ x: x_in, y: y_in })
    if (x < 0 || y < 0) {
      return
    }
    space.move_module(id, x, y)
  }
</script>

<div
  use:useDrag={onMove}
  class="panel"
  style={`grid-column: ${col}; grid-row: ${row}; ${custom_style}`}
>
  <div class="bar">
    <span class="name">{name}</span>
    <span class="actions">
      <button class="clone" on:click={() => space.clone_module(id)}>+</button>
      <button class="close" on:click={() => space.remove_module(id)}>x</button>
    </span>
  </div>
  <slot />
  <div class="inputs">
    <slot class="vertical" name="inputs" />
  </div>
  <div class="outputs">
    <slot class="vertical" name="outputs" />
  </div>
</div>

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
    z-index: 5;
  }

  .bar .actions {
    display: flex;
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

  button.close {
    border-top-right-radius: 0.5rem;
  }

  .bar button {
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

    /* margin-right: -2px; */
    transition: opacity 0.125s;

    pointer-events: all;
  }

  .bar button:hover {
    opacity: 0.75;
  }

  .bar button:active {
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
