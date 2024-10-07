<script lang="ts">
  import CssReset from '../components/CSSReset.svelte'
  import Theme from '../components/Theme.svelte'
  import { navigating } from '$app/stores'
  import Loading from '../components/Loading.svelte'
  import { onDestroy, onMount } from 'svelte'
  import { init_audio } from '../audio'
  import { browser } from '$app/environment'
  import { init_root } from '../context/root'

  let loading = true
  init_root()
  const audio = init_audio()
  // const media = init_media()
  // setContext(MEDIA_CONTEXT, media)

  if (browser) {
    onMount(async () => {
      await audio.load()
      // await media.load()
      loading = false
    })

    onDestroy(() => {
      audio.cleanup()
    })
  }
</script>

<CssReset />
<Theme />
<main>
  {#if $navigating || loading}
    <Loading />
  {:else}
    <slot />
  {/if}
</main>

<style>
  :global(html) {
    background-color: var(--background, initial);
    color: var(--foreground, initial);
  }
  :global(body),
  :global(html) {
    height: 100vh;
  }
  :global(body > div) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(main) {
    overflow-x: auto;
    flex: 1 1 100%;
  }
</style>
