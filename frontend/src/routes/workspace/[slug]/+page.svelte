<script lang="ts">
  import type { PageData } from './$types'

  import WorkspaceView from '../../../workspace/Workspace.svelte'
  import { init_workspace } from '../../../context/workspace'
  import { getGlobalCtx } from '../../../context/global'
  import { type SubDocReference } from '../../../util/subdoc'
  import type { Workspace } from '../../../models/workspace'
  import CurrentWorkspaceSummary from '../../../components/CurrentWorkspaceSummary.svelte'
  import AppLayout from '../../../components/AppLayout.svelte'
  import Loading from '../../../components/Loading.svelte'

  export let data: PageData

  const global = getGlobalCtx()

  const workspace = global.workspaces.get({
    guid: data.workspace.id
  } as SubDocReference<Workspace>)

  init_workspace(workspace)
</script>

<AppLayout>
  <svelte:fragment slot="sidebar-top">
    <div class="mb-6 border-b border-dark pb-4">
      <h2 class="text-lg font-semibold mb-3">Current Workspace</h2>
      <CurrentWorkspaceSummary {workspace} />
    </div>
  </svelte:fragment>

  {#await workspace.load()}
    <Loading />
  {:then}
    <WorkspaceView />
  {:catch error}
    Failed to load workspace: {error.message}
  {/await}
</AppLayout>
