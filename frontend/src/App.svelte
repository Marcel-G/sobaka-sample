<script lang="ts">
  import { onMount } from 'svelte';
  import { init_sampler } from './audio';

  import Sequencer from './components/Sequencer.svelte'

  let sampler = null;

  onMount(async () => {
    sampler = await init_sampler()
  })
</script>

<main>
  {#if sampler}
    <Sequencer sampler={sampler} />
  {:else}
    Loading...
  {/if}
</main>


<style>
  main {
    text-align: center;
    padding: 1em;
  }
</style>