<script lang="ts">
  export let value = ''
</script>

<input
  on:keydown={event => {
    event.stopPropagation()
  }}
  bind:value
  class="text-center block text-foreground rounded-lg border-2 w-full p-2 border-light"
  {...$$restProps}
/>
