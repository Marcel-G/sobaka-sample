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
  import { SamplerNode } from 'sobaka-sample-web-audio'
  import type { InputTypeDTO } from 'sobaka-sample-web-audio'
  import { getContext, onDestroy } from 'svelte'
  import { derived, get } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import type { ModuleContext } from '../state/modules'

  export let on_click: () => void
  export let from: ModuleContext
  export let to: ModuleContext
  export let to_type: InputTypeDTO
  const context: Writable<SamplerNode> = getContext('sampler')

  interface Position {
    x: number
    y: number
  }

  const to_center_point = ($node: Element): Position => {
    const box = $node.getBoundingClientRect()
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    }
  }

  const from_node = from.output_node!
  const to_node = to.input_nodes[JSON.stringify(to_type)]

  const from_pos = derived(from_node, to_center_point)
  const to_pos = derived(to_node, to_center_point)

  const connect = (
    module_source_id: number,
    module_destination_id: number,
    input: InputTypeDTO
  ) => {
    const patch_id = get(context).client.request({
      method: 'module/connect',
      params: [module_source_id, module_destination_id, input]
    }) as Promise<number>

    return async () => {
      void get(context).client.request({
        method: 'module/disconnect',
        params: [await patch_id]
      })
    }
  }

  const disconnect = connect(from.module_id, to.module_id, to_type)

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
