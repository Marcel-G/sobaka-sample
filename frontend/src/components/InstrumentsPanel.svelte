<script lang="ts">
  import type { SamplerNode } from "sobaka-sample-web-audio";
  import type { Writable } from "svelte/store";
  import { getContext } from "svelte";

  export let instruments: any[];

  const sampler: SamplerNode = getContext('sampler');
  const selected_instrument: Writable<string> = getContext('selected_instrument');

  const select_instrument = (string) => {
    selected_instrument.set(string);
  }
</script>

<div>
  Instruments Panel
  {#each instruments as instrument (instrument.uuid)}
    <div
      class="instrument"
      class:selected={$selected_instrument === instrument.uuid}
      on:click={() => select_instrument(instrument.uuid)}
    >
      {instrument.uuid}
      <button
        on:mousedown={() => { sampler.trigger_instrument(instrument.uuid) }}
      >
        Trigger
      </button>
      <button on:click={() => {
        if ($selected_instrument === instrument.uuid) {
          select_instrument(null)
        }
        sampler.destroy_instrument(instrument.uuid)
      }}>
        Remove
      </button>
    </div>
  {/each}
</div>

<button on:click={() => { sampler.add_instrument() }}>
  Add instrument
</button>

<style>
  .instrument {
    cursor: pointer;
    padding: 1rem;
  }
  .instrument.selected {
    background-color: pink;
  }
</style>
