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
  import { AnyInput, ModuleType, SobakaContext } from 'sobaka-sample-web-audio'
  import { getContext, onDestroy } from 'svelte'
  import { derived, get } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import type { ModuleContext } from '../state/modules'

  export let on_click: () => void
  export let from: Required<ModuleContext<ModuleType>>
  export let to: Required<ModuleContext<ModuleType>>
  export let to_input: AnyInput
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

  const from_node = from.output
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const to_node = to.input[to_input]!

  const from_pos = derived(from_node, to_center_point)
  const to_pos = derived(to_node, to_center_point)

  // @todo store AbstractModule in state
  const disconnect = get(context).link(from.module, to.module, to_input)

  onDestroy(disconnect)
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
