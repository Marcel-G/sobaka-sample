<script lang="ts">
  import '../app.css'
  // Import DSP layer to register all module factories
  import '@sobaka/dsp'
  import { onDestroy, onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { createGlobalCtx, type Global } from '../context/global'
  import { type PageData } from './$types'
  import LoadingScreen from '@sobaka/ui/components/LoadingScreen.svelte'

  export let data: PageData
  let global: Global | null = null
  let loadingStatus = $state('Initializing...')

  if (browser) {
    onMount(async () => {
      loadingStatus = 'Connecting to network...'
      global = await createGlobalCtx(data.config, (status) => {
        loadingStatus = status
      })
    })

    onDestroy(() => {
      global?.cleanup()
    })
  }
</script>

{#if !global}
  <LoadingScreen 
    message="Starting up" 
    status={loadingStatus} 
  />
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
