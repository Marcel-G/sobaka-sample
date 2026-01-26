<script lang="ts">
  import { getGlobalCtx } from '../context/global'
  import { WorkspaceList } from '@sobaka/state/models/workspaceList'
  import { InvalidDocument } from '@sobaka/state/models/docMeta'
  import WorkspaceSummary from './WorkspaceSummary.svelte'

  const global = getGlobalCtx()

  export let workspaceList: WorkspaceList
  /** If true, this is a global list that only admins can edit */
  export let isGlobalList = false

  const workspaceRefs = workspaceList.workspaces()
  const isEditable = workspaceList.isEditable
  const isAdmin = global.isAdmin
  
  // For global lists: only admins can edit
  // For user lists: use normal isEditable (collaborator check)
  $: canEdit = isGlobalList ? $isAdmin : $isEditable
  
  // Show "+ Add Workspace" only on global lists for admins, or on user lists
  $: showAddButton = (isGlobalList && $isAdmin) || (!isGlobalList && $isEditable)
  
  $: workspaces = $workspaceRefs.map(ref => global.workspaces.get(ref))
  $: listName = workspaceList.meta.name ?? 'Workspaces'

  function addWorkspace() {
    const workspace = global.workspaces.get()
    workspace.create(global.user.uuid)
    workspaceList.add(workspace)
  }
  
  /**
   * Handle load errors - returns true if the error is an invalid document
   * (wrong kind, corrupt) that should be silently skipped.
   */
  function isInvalidDocError(error: unknown): boolean {
    return error instanceof InvalidDocument
  }
</script>

<div class="mb-6">
  <div class="flex items-center justify-between mb-2">
    <h2 class="text-lg font-semibold text-light">{listName}</h2>
    {#if showAddButton}
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
      {:catch error}
        {#if isInvalidDocError(error)}
          <!-- Skip invalid documents silently (wrong kind, corrupt) -->
          <!-- Optionally show a small indicator for admins -->
          {#if $isAdmin}
            <li class="text-xs text-red-400/50 italic">
              Invalid: {workspace.id.slice(0, 8)}...
              <button
                class="ml-2 underline"
                on:click={() => workspaceList.remove(workspace.intoRef())}
              >
                remove
              </button>
            </li>
          {/if}
        {:else}
          <li class="text-red-400 text-sm">Failed to load workspace</li>
        {/if}
      {/await}
    {/each}
  </ul>
  {#if $workspaceRefs.length === 0}
    <p class="text-sm text-light/50 italic">No workspaces yet</p>
  {/if}
</div>
