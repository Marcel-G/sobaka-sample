<script lang="ts">
  import type { SamplerNode } from "sobaka-sample-web-audio";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  export let sequence: any[][];
  export let active_step: number;

  const sampler: SamplerNode = getContext("sampler");

  $: col = `repeat(${sequence.length}, 1fr)`;
  $: row = `repeat(2, 0fr)`;

  const selected_instrument: Writable<string> = getContext(
    "selected_instrument"
  );

  let mouse_down = false;

  function select(i: number) {
    if (mouse_down && $selected_instrument) {
      if (sequence[i].find(({ uuid }) => $selected_instrument === uuid)) {
        console.log(i, $selected_instrument);
        sampler.unassign_instrument(i, $selected_instrument);
      } else {
        sampler.assign_instrument(i, $selected_instrument);
      }
    }
  }

  function handle_click(i) {
    return (event) => {
      if ("buttons" in event && event.buttons == 1) {
        mouse_down = true;
        select(i);
      }
    };
  }
</script>

<svelte:window
  on:mouseup={() => {
    mouse_down = false;
  }}
/>

<div
  class="container"
  style="grid-template-rows: {row}; grid-template-columns: {col};"
>
  {#each sequence as assignments, i (i)}
    <div
      class="step"
      class:active={i === active_step}
      on:mousedown={handle_click(i)}
      on:mouseover={() => select(i)}
    >
      {#each assignments as instrument (instrument.uuid)}
        <span class="assignment">{instrument.uuid}</span>
      {/each}
    </div>
    <div
      class="indicator"
      class:active={i === active_step}
      on:mousedown={handle_click(i)}
      on:mouseover={() => select(i)}
    />
  {/each}
</div>

<style>
  .container {
    width: 100%;
    display: grid;
    grid-auto-flow: column;
    border: 1px solid #999;
    border-left: none;
    min-width: 0;
  }
  .step,
  .indicator {
    cursor: pointer;
    border-left: 1px solid #999;
    min-width: 0;
  }

  .step {
    overflow: hidden;
    min-height: 4rem;
    border-bottom: none;
  }

  .indicator {
    border-top: none;
  }
  .indicator::after {
    content: "";
    display: block;
    height: 1em;
    width: 1em;

    margin: 0.5rem auto;

    background-color: hsl(0deg 100% 20%);
    border-radius: 50%;

    /* transition: background-color 0.1s ease-out; */
  }

  .indicator.active::after {
    background-color: hsl(0deg 100% 50%);
  }

  .assignment {
    user-select: none;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    font-size: 12px;
    display: block;
  }
</style>
