<script lang="ts">
  import { onDestroy } from 'svelte'
  import { derived } from '@crikey/stores-immer'
  import { writable, Writable } from 'svelte/store'
  import { PlugContext, PlugType } from '../workspace/plugs'
  import { Position } from '../@types'
  import { mouse_position } from '../workspace/Workspace.svelte'

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  export let on_click = () => {}
  export let from: PlugContext | null = null
  export let to: PlugContext | null = null

  const element: Writable<Element | null> = writable(null)

  const to_center_point = ([node, element]: Array<Element | null>): Position => {
    if (!element || !node) return { x: 0, y: 0 }
    if (!(node instanceof Element)) throw new Error('Could not find element')
    const parent = element.parentElement
    if (!(parent instanceof Element)) throw new Error('Could not find parent element')

    const box = node.getBoundingClientRect()
    const parent_rect = parent.getBoundingClientRect()

    const x = box.x + box.width / 2 - parent_rect.left
    const y = box.y + box.height / 2 - parent_rect.top

    return { x, y }
  }

  const from_pos = from ? derived([from.node, element], to_center_point) : mouse_position

  const to_pos = to ? derived([to.node, element], to_center_point) : mouse_position

  if (from && to) {
    if (to.type === PlugType.Param) {
      from.module.connect(to.module, from.id)

      onDestroy(() => {
        if (from && to) {
          from.module.disconnect(to.module, from.id)
        }
      })
    } else if (to.type === PlugType.Input) {
      from.module.connect(to.module, from.id, to.id)

      onDestroy(() => {
        if (from && to) {
          from.module.disconnect(to.module, from.id, to.id)
        }
      })
    } else {
      throw new Error(
        `Cannot connect to output node: ${JSON.stringify({ from, to }, null, 2)}`
      )
    }
  }
</script>

<g class="wire" on:click={on_click} class:interactive={from && to} bind:this={$element}>
  <line
    stroke-width="2"
    x1={$from_pos.x}
    y1={$from_pos.y}
    x2={$to_pos.x}
    y2={$to_pos.y}
  />
  <circle cx={$from_pos.x} cy={$from_pos.y} r="3" />
  <circle cx={$to_pos.x} cy={$to_pos.y} r="3" />
</g>

<style>
  .wire {
    stroke: var(--orange);
    fill: var(--orange);
    pointer-events: none;
  }

  .wire.interactive {
    cursor: pointer;
    pointer-events: all;
  }
  .wire.interactive:hover {
    stroke: var(--red);
    fill: var(--red);
  }
</style>
