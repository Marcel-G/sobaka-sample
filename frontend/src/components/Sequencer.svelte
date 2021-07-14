<script lang="ts">
  import type { SamplerNode } from "sobaka-sample-web-audio";
  import { setContext } from "svelte";
  import { readable, writable } from "svelte/store";
  import SequencerPanel from './SequencerPanel.svelte'
  import InstrumentsPanel from "./InstrumentsPanel.svelte";

  export let sampler: SamplerNode;

  const selected_instrument = writable(null)

  setContext('selected_instrument', selected_instrument);
  setContext('sampler', sampler);

  const active_step = readable(0, sampler.subscribe('on_active_step'));
  const instruments = readable([], sampler.subscribe('on_instruments'));
  const is_playing  = readable(false, sampler.subscribe('on_is_playing'));
  const sequence    = readable(
    new Array(16).fill([]),
    sampler.subscribe('on_sequence')
  );


  function handle_play() {
    if ($is_playing) {
      sampler.stop();
    } else {
      sampler.play();
    }
  }
</script>

<div>
  <SequencerPanel
    active_step={$active_step}
    sequence={$sequence}
  />
  <InstrumentsPanel
    instruments={$instruments}
  />
  <button on:click={handle_play}>
    {#if $is_playing}
      Stop
    {:else}
      Play
    {/if}
  </button>
</div>

<style>
</style>
