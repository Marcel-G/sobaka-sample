<script lang="ts">
  import { getGlobalCtx } from '../context/global'
  import { WorkspaceList } from '@sobaka/state/models/workspaceList'
  import WorkspaceSummary from './WorkspaceSummary.svelte'

  const global = getGlobalCtx()

  export let workspaceList: WorkspaceList

  const workspaceRefs = workspaceList.workspaces()
  const isEditable = workspaceList.isEditable
  $: workspaces = $workspaceRefs.map(ref => global.workspaces.get(ref))
  $: listName = workspaceList.meta.name ?? 'Workspaces'
</script>

<div class="mb-6">
  <h2 class="text-lg font-semibold text-light mb-2">{listName}</h2>
  <ul class="space-y-1">
    {#each workspaces as workspace (workspace.id)}
      {#await workspace.load()}
        <li class="animate-pulse bg-dark h-16 rounded-md"></li>
      {:then}
        <WorkspaceSummary {workspace}>
          {#if $isEditable}
            <button
              class="text-light cursor-pointer text-sm px-2 py-1 rounded-md transition-colors"
              on:click={() => workspaceList.remove(workspace.intoRef())}
            >
              Remove
            </button>
          {/if}
        </WorkspaceSummary>
      {/await}
    {/each}
  </ul>
  {#if $workspaceRefs.length === 0}
    <p class="text-sm text-light/50 italic">No workspaces yet</p>
  {/if}
</div>
