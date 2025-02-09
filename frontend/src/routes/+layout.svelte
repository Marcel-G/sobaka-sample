<script lang="ts">
  import '../app.css'
  import { onDestroy, onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { createGlobalCtx, type Global } from '../context/global'
  import { type PageData } from './$types'
  import Loading from '../components/Loading.svelte'

  export let data: PageData
  let global: Global | null = null

  if (browser) {
    onMount(async () => {
      global = await createGlobalCtx(data.config)
    })

    onDestroy(() => {
      global?.cleanup()
    })
  }
</script>

{#if !global}
  <Loading />
{:else}
  <slot />
{/if}

<style lang="postcss">
  :global(html) {
    background-color: var(--color-darker);
    color: var(--color-light);
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
