<script lang="ts">
  export let value = ''
</script>

<input
  on:keydown={event => {
    event.stopPropagation()
  }}
  bind:value
/>

<style>
  input {
    text-align: center;
    display: block;
    color: var(--foreground);
    border-radius: 0.5rem;
    border: 2px solid transparent;
    width: 100%;
    padding: 0.5rem;
  }

  input:hover {
    border-color: var(--foreground);
  }

  input:focus {
    border-color: var(--cyan);
  }
</style>
