<script lang="ts">
  import { getGlobalCtx } from '../context/global'
  import { WorkspaceList } from '@sobaka/state/models/workspaceList'
  import WorkspaceSummary from './WorkspaceSummary.svelte'

  const global = getGlobalCtx()

  export let workspaceList: WorkspaceList
  /** If true, admin users can edit this list even if not a collaborator */
  export let allowAdminEdit = false

  const workspaceRefs = workspaceList.workspaces()
  const isEditable = workspaceList.isEditable
  const isAdmin = global.isAdmin
  
  // Allow editing if user is a collaborator OR if admin and allowAdminEdit is set
  $: canEdit = $isEditable || (allowAdminEdit && $isAdmin)
  $: workspaces = $workspaceRefs.map(ref => global.workspaces.get(ref))
  $: listName = workspaceList.meta.name ?? 'Workspaces'

  function addWorkspace() {
    const workspace = global.workspaces.get()
    workspace.create(global.user.uuid)
    workspaceList.add(workspace)
  }
</script>

<div class="mb-6">
  <div class="flex items-center justify-between mb-2">
    <h2 class="text-lg font-semibold text-light">{listName}</h2>
    {#if canEdit}
      <button
        class="text-sm px-3 py-1 bg-primary text-light rounded-md hover:bg-primary/80 transition-colors cursor-pointer"
        on:click={addWorkspace}
      >
        + Add Workspace
      </button>
    {/if}
  </div>
  <ul class="space-y-1">
    {#each workspaces as workspace (workspace.id)}
      {#await workspace.load()}
        <li class="animate-pulse bg-dark h-16 rounded-md"></li>
      {:then}
        <WorkspaceSummary {workspace}>
          {#if canEdit}
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
