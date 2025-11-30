<script lang="ts">
  import { getGlobalCtx } from '../context/global'
  import { WorkspaceList } from '@sobaka/state/models/workspaceList'
  import WorkspaceSummary from './WorkspaceSummary.svelte'

  const global = getGlobalCtx()

  export let workspaceList: WorkspaceList

  const workspaceRefs = workspaceList.workspaces()
  $: workspaces = $workspaceRefs.map(ref => global.workspaces.get(ref))
</script>

<ul class="space-y-1">
  {#each workspaces as workspace (workspace.id)}
    {#await workspace.load()}
      <li class="animate-pulse bg-dark h-16 rounded-md"></li>
    {:then}
      <WorkspaceSummary {workspace}>
        <button
          class="text-light cursor-pointer text-sm px-2 py-1 rounded-md transition-colors"
          on:click={() => workspaceList.remove(workspace.intoRef())}
        >
          Remove
        </button>
      </WorkspaceSummary>
    {/await}
  {/each}
</ul>
