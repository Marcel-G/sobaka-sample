<script lang="ts">
  import Spinner from './Spinner.svelte'

  interface Props {
    /** Main message to display */
    message?: string
    /** Secondary/status message */
    status?: string
    /** Whether to show the spinner */
    showSpinner?: boolean
  }

  let { 
    message = 'Loading', 
    status = '', 
    showSpinner = true 
  }: Props = $props()
</script>

<div class="loading-screen">
  <div class="content">
    {#if showSpinner}
      <div class="spinner-wrapper">
        <Spinner />
      </div>
    {/if}
    
    <h2 class="message">{message}</h2>
    
    {#if status}
      <p class="status">{status}</p>
    {/if}
  </div>
</div>

<style>
  .loading-screen {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--color-darker);
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    text-align: center;
    padding: 2rem;
  }

  .spinner-wrapper {
    transform: scale(1.5);
  }

  .message {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--color-light);
    margin: 0;
  }

  .status {
    font-size: 0.875rem;
    color: var(--color-medium);
    margin: 0;
    max-width: 300px;
  }
</style>
