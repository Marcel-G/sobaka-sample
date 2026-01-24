<script lang="ts">
  import '../app.css'
  // Import DSP layer to register all module factories
  import '@sobaka/dsp'
  import { onDestroy, onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { createGlobalCtx, type Global } from '../context/global'
  import { type PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let global: Global | null = $state(null)

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
  <div class="loading-screen">
    <div class="spinner"></div>
    <p class="message">Starting up...</p>
  </div>
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

  .loading-screen {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    background: conic-gradient(from 90deg at 1px 1px, #0000 90deg, var(--color-dark) 0) 0
      0 / 1rem 1rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-dark);
    border-top-color: var(--color-purple);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .message {
    font-size: 1.25rem;
    color: var(--color-light);
  }
</style>
