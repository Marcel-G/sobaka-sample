<script lang="ts">
  import type { PageData } from './$types'

  import Workspace from '../../../../../workspace/Workspace.svelte'

  export let data: PageData
</script>

{#key data.workspace.id}
  <Workspace workspace_document={data.workspace} />
{/key}
