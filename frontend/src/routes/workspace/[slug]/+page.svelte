<script lang="ts">
  import type { PageData } from './$types'

  import Workspace from '../../../workspace/Workspace.svelte'

  export let data: PageData
</script>

<Workspace workspace_document={data.workspace} />
