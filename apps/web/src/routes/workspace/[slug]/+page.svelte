<script lang="ts">
  import type { PageData } from './$types'

  import WorkspaceView from '../../../workspace/Workspace.svelte'
  import { useWorkspace } from '../../../context/workspace'
  import { getGlobalCtx } from '../../../context/global'
  import { type SubDocReference } from '@sobaka/state/util/subdoc'
  import type { Workspace } from '@sobaka/state/models/workspace'
  import CurrentWorkspaceSummary from '../../../components/CurrentWorkspaceSummary.svelte'
  import AppLayout from '../../../components/AppLayout.svelte'
  import Loading from '@sobaka/ui/components/Loading.svelte'

  let { data }: { data: PageData } = $props()

  const context = getGlobalCtx()

  const workspace = $derived(context.workspaces.get({
    guid: data.workspace.id
  } as SubDocReference<Workspace>))

  const loading = $derived(workspace.load())

  // Set up workspace context and handle cleanup on workspace changes
  $effect(() => useWorkspace(workspace))
</script>

<AppLayout>
  <svelte:fragment slot="sidebar-top">
    {#await loading}
      <Loading />
    {:then}
      <div class="mb-6 border-b border-dark pb-4">
        <CurrentWorkspaceSummary {workspace} />
      </div>
    {/await}
  </svelte:fragment>

  {#await loading}
    <Loading />
  {:then}
    <WorkspaceView />
  {:catch error}
    Failed to load workspace: {error.message}
  {/await}
</AppLayout>
