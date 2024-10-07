<script lang="ts">
  import { WorkspaceList } from '../models/workspaceList'
  import WorkspaceSummary from './WorkspaceSummary.svelte'

  export let workspaceList: WorkspaceList

  const workspaces = workspaceList.workspaces()
</script>

{#each $workspaces as workspace (workspace.id)}
  <WorkspaceSummary {workspace} />
  <button on:click={() => workspaceList.remove(workspace)}>Remove</button>
{/each}
