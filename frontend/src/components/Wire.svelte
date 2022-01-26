<style>
  .wire {
    pointer-events: all;
    cursor: pointer;
    stroke: black;
  }
  .wire:hover {
    stroke: red;
  }
</style>

<script lang="ts">
  import { SobakaContext } from 'sobaka-sample-audio-worklet'
  import { getContext, onDestroy } from 'svelte'
  import { derived, get } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import type { PlugContext } from '../state/plug'

  export let on_click: () => void
  export let from: PlugContext
  export let to: PlugContext
  const context: Writable<SobakaContext> = getContext('sampler')

  interface Position {
    x: number
    y: number
  }

  const to_center_point = (node: Element): Position => {
    if (!node) return { x: 0, y: 0 } // @todo

    const box = node.getBoundingClientRect()
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    }
  }

  const from_pos = derived(from.node, to_center_point)
  const to_pos = derived(to.node, to_center_point)

  // @todo store AbstractNode in state
  if (to.input) {
    const disconnect = get(context).link(from.module, to.module, to.input)
    onDestroy(disconnect)
  } else {
    throw new Error(
      `Cannot connect to output node: ${JSON.stringify({ from, to }, null, 2)}`
    )
  }
</script>

<line
  on:click={on_click}
  class="wire"
  stroke-width="4"
  x1={$from_pos.x}
  y1={$from_pos.y}
  x2={$to_pos.x}
  y2={$to_pos.y}
/>
<circle cx={$from_pos.x} cy={$from_pos.y} r="4" />
<circle cx={$to_pos.x} cy={$to_pos.y} r="4" />
