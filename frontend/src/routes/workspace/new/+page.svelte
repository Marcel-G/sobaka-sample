<script lang="ts">
  import { onMount } from 'svelte'
  import { getGlobalCtx } from '../../../context/global'
  import { goto } from '$app/navigation'

  onMount(async () => {
    const context = getGlobalCtx()
    const workspace = context.createWorkspace()
    await goto(`/workspace/${workspace.id}`, { replaceState: true })
  })
</script>
