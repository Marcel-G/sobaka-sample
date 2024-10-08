<script lang="ts">
  import type { PageData } from './$types'

  import WorkspaceView from '../../../workspace/Workspace.svelte'
  import { init_workspace } from '../../../context/workspace'
  import { Workspace } from '../../../models/workspace'

  export let data: PageData

  const workspace = Workspace.fromId(data.workspace.id)

  if (!workspace) {
    throw new Error(`Workspace ${data.workspace.id} not found`)
  }

  init_workspace(workspace)
</script>

{#await workspace.load()}
  <!-- TODO: skeleton loading UI -->
{:then}
  <WorkspaceView />
{/await}
