<script lang="ts">
  import type { PageData } from './$types'

  import WorkspaceView from '../../../workspace/Workspace.svelte'
  import { init_workspace } from '../../../context/workspace'
  import { getGlobalCtx } from '../../../context/global'
  import { type SubDocReference } from '../../../util/subdoc'
  import type { Workspace } from '../../../models/workspace'

  export let data: PageData

  const context = getGlobalCtx()

  const workspace = context.workspaces.get({
    guid: data.workspace.id
  } as SubDocReference<Workspace>)

  init_workspace(workspace)
</script>

{#await workspace.load()}
  <!-- TODO: skeleton loading UI -->
{:then}
  <WorkspaceView />
{:catch error}
  Failed to load workspace: {error.message}
{/await}
