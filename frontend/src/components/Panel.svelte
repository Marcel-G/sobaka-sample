<style>
  .panel {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -2px rgb(0 0 0 / 5%);
    border-radius: 0.5rem;
    background-color: pink;
    padding: 0.5rem;
    /* overflow: hidden; */

    cursor: move;

    user-select: none;

    position: relative;
  }

  .bar {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    transform: translateY(-100%);
    padding: 0.25rem 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .close {
  }

  .name {
    text-transform: uppercase;
    font-family: monospace;
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
</style>

<script lang="ts">
  import modules from '../state/modules'
  import { useDrag } from '../actions/drag'
  import type { OnDrag } from '../actions/drag'
  import { setContext } from 'svelte'
  export let id: string
  export let name: string
  export let position: { x: number; y: number }
  export let height = 0
  export let width = 0

  const moveContext = new EventTarget()
  setContext('move_context', moveContext)

  $: col = `${position.x + 1} / span ${width}`
  $: row = `${position.y + 1} / span ${height}`

  const grid = 1.5 * 16 // grid is 2rem;
  const gap = 0.5 * 16 // grid is 0.5rem

  const onMove: OnDrag = (x, y, box) => {
    x = Math.round(x / (grid + gap))
    y = Math.round(y / (grid + gap))
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

<div class="panel" use:useDrag={onMove} style={`grid-column: ${col}; grid-row: ${row};`}>
  <div class="bar">
    <span class="name">{name}</span>
    <button class="close" on:click={() => modules.remove(id)}>x</button>
  </div>
  <slot />
  <div class="inputs">
    <slot name="inputs" />
  </div>
  <div class="outputs">
    <slot name="outputs" />
  </div>
</div>
