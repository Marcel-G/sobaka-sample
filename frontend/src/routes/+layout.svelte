<script lang="ts">
  import Navigation from '../components/Navigation.svelte'
  import CssReset from '../components/CSSReset.svelte'
  import Theme from '../components/Theme.svelte'
  import { navigating } from '$app/stores'
  import Loading from '../components/Loading.svelte'
</script>

<CssReset />
<Theme />
<Navigation />
<main>
  {#if $navigating}
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
