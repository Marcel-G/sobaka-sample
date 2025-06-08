<script lang="ts">
  export let value = ''
</script>

<input
  on:keydown={event => {
    event.stopPropagation()
  }}
  bind:value
  class="text-2xl font-bold block text-foreground rounded-lg border-2 w-full p-2 border-light"
  {...$$restProps}
/>
