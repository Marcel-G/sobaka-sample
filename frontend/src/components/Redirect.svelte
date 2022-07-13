<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from 'svelte-routing'

  export let to: string

  onMount(() => {
    navigate(to)
  })
</script>
