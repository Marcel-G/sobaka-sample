<script lang="ts">
  import { getGlobalCtx } from '../context/global'
  import { WorkspaceList } from '../models/workspaceList'
  import WorkspaceSummary from './WorkspaceSummary.svelte'

  const global = getGlobalCtx()

  export let workspaceList: WorkspaceList

  const workspace_refs = workspaceList.workspaces()
  $: workspaces = $workspace_refs.map(ref => global.workspaces.get(ref))
</script>

{#each workspaces as workspace (workspace.id)}
  {#await workspace.load()}
    <!-- TODO: skeleton loading UI -->
  {:then}
    <WorkspaceSummary {workspace}>
      <button on:click={() => workspaceList.remove(workspace.intoRef())}>Remove</button>
    </WorkspaceSummary>
  {/await}
{/each}
