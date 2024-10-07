<script lang="ts">
  import type { PageData } from './$types'

  import WorkspaceView from '../../../workspace/Workspace.svelte'
  import { init_workspace } from '../../../context/workspace'
  import { get_root } from '../../../context/root'

  export let data: PageData

  const root = get_root()

  const workspace = root.find_workspace(data.workspace.id)

  if (!workspace) {
    throw new Error(`Workspace ${data.workspace.id} not found`)
  }

  init_workspace(workspace)
</script>

{#key data.workspace.id}
  <WorkspaceView />
{/key}
