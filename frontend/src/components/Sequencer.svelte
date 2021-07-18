<script lang="ts">
  import type { SamplerNode } from "sobaka-sample-web-audio";
  import { onMount, setContext } from "svelte";
  import { readable, writable } from "svelte/store";
  import SequencerPanel from './SequencerPanel.svelte'
  import InstrumentsPanel from "./InstrumentsPanel.svelte";
  import { init_key_bindings } from "../key_bindings";

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

  onMount(() => {
    return init_key_bindings(
      sampler as any,
      instruments,
      selected_instrument
    )
  })

  function handle_play() {
    if ($is_playing) {
      sampler.stop();
    } else {
      sampler.play();
    }
  }
</script>

<div>
  <button class="play" on:click={handle_play}>
    {#if $is_playing}
      Stop
    {:else}
      Play
    {/if}
  </button>
  <SequencerPanel
    active_step={$active_step}
    sequence={$sequence}
  />
  <InstrumentsPanel
    instruments={$instruments}
  />
</div>

<style>
  button.play {
    display: block;
    margin-left: auto;
  }
</style>
