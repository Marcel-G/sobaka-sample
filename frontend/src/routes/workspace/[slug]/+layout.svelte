<script context="module" lang="ts">
  export const AUDIO_CONTEXT = 'AUDIO_CONTEXT'
  export const get_audio_context = () =>
    getContext<Writable<SobakaContext>>(AUDIO_CONTEXT)
</script>

<script lang="ts">
  import type { SobakaContext } from 'sobaka-sample-audio-worklet'

  import { getContext, onDestroy, onMount, setContext } from 'svelte'
  import { get, writable } from '@crikey/stores-immer'
  import type { Writable } from 'svelte/store'
  import Spinner from '../../../components/Spinner.svelte'
  import { init_sampler } from '../../../audio'

  const audio_context: Writable<SobakaContext | null> = writable(null)
  setContext(AUDIO_CONTEXT, audio_context)

  onMount(async () => {
    $audio_context = await init_sampler()
  })

  onDestroy(() => {
    void get(audio_context)?.destroy()
    $audio_context = null
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
