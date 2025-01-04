<script lang="ts">
  import { WorkspaceList } from '../models/workspaceList'
  import type { Config } from '../routes/proxy+layout.server'
  import WorkspaceSummary from './WorkspaceSummary.svelte'

  export let config: Config
  export let workspaceList: WorkspaceList

  const workspaces = workspaceList.workspaces()
</script>

{#each $workspaces as workspace (workspace.id)}
  {#await workspace.load(config)}
    <!-- TODO: skeleton loading UI -->
  {:then}
    <WorkspaceSummary {workspace} />
    <button on:click={() => workspaceList.remove(workspace)}>Remove</button>
  {/await}
{/each}
