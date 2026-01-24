<script lang="ts">
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
      <div class="spinner"></div>
    {/if}
    
    {#if message}
      <p class="message">{message}</p>
    {/if}
    
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
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-dark);
    border-top-color: var(--color-purple);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 0.5rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .message {
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-light);
    margin: 0;
  }

  .status {
    font-size: 0.875rem;
    color: var(--color-blue);
    margin: 0;
    max-width: 300px;
  }
</style>
