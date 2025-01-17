<script lang="ts">
  import 'ress/dist/ress.min.css'
  import Theme from '../components/Theme.svelte'
  import { navigating } from '$app/stores'
  import Loading from '../components/Loading.svelte'
  import { onDestroy, onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { type PageData } from './$types'
  import { createGlobalCtx, type Global } from '../context/global'

  export let data: PageData
  let context: Global | null = null

  if (browser) {
    onMount(async () => {
      context = await createGlobalCtx(data.config)
    })

    onDestroy(() => {
      context?.cleanup()
    })
  }
</script>

<Theme />
<main>
  {#if $navigating || !context}
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
