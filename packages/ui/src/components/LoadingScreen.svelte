<script lang="ts">
  interface Props {
    /** Message to display below spinner */
    message?: string
  }

  let { message = 'Loading...' }: Props = $props()
</script>

<div class="loading-screen">
  <div class="spinner"></div>
  <p class="message">{message}</p>
</div>

<style>
  .loading-screen {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
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
    font-size: 1rem;
    color: var(--color-light);
    margin: 0;
  }
</style>
