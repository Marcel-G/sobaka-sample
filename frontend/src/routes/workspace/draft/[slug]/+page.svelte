<script lang="ts">
  import type { PageData } from './$types'

  import Workspace from '../../../../workspace/Workspace.svelte'
  import { init_workspace } from '../../../../workspace/context'

  export let data: PageData

  $: console.log(data);

  $: init_workspace(data.workspace)
</script>

{#key data.workspace.id}
  <Workspace />
{/key}
