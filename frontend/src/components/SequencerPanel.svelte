<script lang="ts">
  import type { SamplerNode } from "sobaka-sample-web-audio";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  export let sequence: any[][];
  export let active_step: number;

  const sampler: SamplerNode = getContext('sampler');

  $: col = `repeat(${sequence.length}, 1fr)`;
  $: row = `repeat(1, 1fr)`;

  const selected_instrument: Writable<string> = getContext('selected_instrument');

  let mouse_down = false;

  function handle_mouse_down(i: number) {
    mouse_down = true;
    select(i);
  }

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
</script>

<svelte:window on:mouseup={() => { mouse_down = false }}/>

<div
  class="container"
  style="grid-template-rows: {row}; grid-template-columns: {col};"
>
  {#each sequence as assignments, i (i)}
    <div
      class="step"
      class:active={i === active_step}
      class:selected={false}
      on:mousedown={(event) => {
        if ("buttons" in event && event.buttons == 1) {
          handle_mouse_down(i)
        }
      }}
      on:mouseover={() => select(i)}
    >
    {#each assignments as instrument (instrument.uuid)}
      <span class="assignment">{instrument.uuid}</span>
    {/each}
    </div>
  {/each}
</div>

<style>
  .container {
    width: 100%;
    display: grid;
    border: 1px solid #999;
    border-radius: 2px;
    grid-gap: 1px;
    background: #999;
  }

  .container div {
    background: #fff;
    cursor: pointer;
    padding-top: 200%;
  }
  .step.selected {
    background: black;
  }

  .step::after {
    content: '';
    display: block;
    height: 1em;
    width: 1em;

    margin: 0.5rem auto;

    background-color: hsl(0deg 100% 20%);
    border-radius: 50%;

    /* transition: background-color 0.1s ease-out; */
  }

  .step.active::after {
    background-color: hsl(0deg 100% 50%);
  }

  .assignment {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    font-size: 12px;
    display: block;
    width: 50px;
  }
</style>
