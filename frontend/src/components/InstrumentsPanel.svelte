<script lang="ts">
  import type { SamplerNode } from "sobaka-sample-web-audio";
  import type { Writable } from "svelte/store";
  import { getContext } from "svelte";
  import Envelope from "./Envelope.svelte";

  export let instruments: any[];

  const sampler: SamplerNode = getContext('sampler');
  const selected_instrument: Writable<string> = getContext('selected_instrument');

  const select_instrument = (string) => {
    selected_instrument.set(string);
  }
</script>

<div>
  <h3>Instruments Panel</h3>
  <button on:click={() => { sampler.add_instrument({ kind: 'SynthHat', data: null }) }}>
    Add Hat
  </button>

  <button on:click={() => { sampler.add_instrument({ kind: 'SynthSnare', data: null }) }}>
    Add Snare
  </button>

  <button on:click={() => { sampler.add_instrument({ kind: 'SynthKick', data: null }) }}>
    Add Kick
  </button>

  {#each instruments as instrument (instrument.uuid)}
    <div
      class="instrument"
      class:selected={$selected_instrument === instrument.uuid}
      on:click={() => select_instrument(instrument.uuid)}
    >
      {instrument.uuid}
      <Envelope data={instrument.envelope} />
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

<style>
  .instrument {
    cursor: pointer;
    padding: 1rem;
  }
  .instrument.selected {
    background-color: pink;
  }
</style>
