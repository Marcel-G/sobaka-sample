<script lang="ts">
  import type { InputTypeDTO, SamplerNode } from "sobaka-sample-web-audio";
  import { getContext, onDestroy } from "svelte";
  import { derived, get, Readable, Writable } from "svelte/store";

  export let on_click: () => void;
  export let from: number;
  export let from_node: Readable<Element>;
  export let to: number;
  export let to_node: Readable<Element>;
  export let to_type: InputTypeDTO;
  const context: Writable<SamplerNode> = getContext("sampler");

  interface Position {
    x: number;
    y: number;
  }

  const to_center_point = ($node): Position => {
    const box = $node.getBoundingClientRect();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
  }

  const from_pos = derived(from_node, to_center_point);
  const to_pos = derived(to_node, to_center_point);

  const connect = (
    module_source_id: number,
    module_destination_id: number,
    input: InputTypeDTO
  ) => {
    let patch_id = $context.client.request({
      method: "module/connect",
      params: [module_source_id, module_destination_id, input],
    });

    return async () => {
      $context.client.request({
        method: "module/disconnect",
        params: [await patch_id],
      });
    };
  };

  const disconnect = connect(from, to, to_type);

  onDestroy(disconnect);
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