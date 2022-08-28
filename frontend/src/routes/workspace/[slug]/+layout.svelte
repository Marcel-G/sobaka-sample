<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Spinner from '../../../components/Spinner.svelte'
  import { get_context as get_audio_context, init_audio } from '../../../audio'

  const audio = init_audio()
  const audio_context = get_audio_context()

  onMount(async () => {
    await audio.load()
  })

  onDestroy(() => {
    audio.cleanup()
  })
</script>

<main>
  {#if $audio_context}
    <slot />
  {:else}
    <div class="spinner-container">
      <Spinner />
    </div>
  {/if}
</main>

<style>
  :global(html) {
    background-color: var(--background, initial);
    color: var(--foreground, initial);
  }

  .spinner-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
