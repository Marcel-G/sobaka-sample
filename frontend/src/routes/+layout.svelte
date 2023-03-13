<script lang="ts">
  import CssReset from '../components/CSSReset.svelte'
  import Theme from '../components/Theme.svelte'
  import { navigating } from '$app/stores'
  import Loading from '../components/Loading.svelte'
  import { onDestroy, onMount, setContext } from 'svelte'
  import { init_audio } from '../audio'
  import { browser } from '$app/environment'
  import { init_media, MEDIA_CONTEXT } from '../worker/media'
  import { init_repo } from '../worker/ipfs'
  import { init_user } from '../worker/user'

  let loading = true
  const audio = init_audio()
  const media = init_media()
  setContext(MEDIA_CONTEXT, media)

  if (browser) {
    onMount(async () => {
      // @todo -- make initialisation better
      await init_repo(init_user())
      await audio.load()
      await media.load()
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
