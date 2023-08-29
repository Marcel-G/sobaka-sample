<script lang="ts">
  import CssReset from '../components/CSSReset.svelte'
  import Theme from '../components/Theme.svelte'
  import { navigating } from '$app/stores'
  import Loading from '../components/Loading.svelte'
  import { onDestroy, onMount } from 'svelte'
  import { init_audio } from '../audio'
  import { browser } from '$app/environment'
  import NetworkDebug from '../components/NetworkDebug.svelte'

  let loading = true
  const audio = init_audio()

  if (browser) {
    onMount(async () => {
      await audio.load()
      loading = false
    })

    onDestroy(() => {
      audio.cleanup()
    })
  }
</script>

<CssReset />
<Theme />
<NetworkDebug />
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
