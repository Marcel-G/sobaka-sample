<script lang="ts">
  import { GLOBAL_INTRO_LIST_UUID } from '@sobaka/state'
  import WorkspaceListComponent from '../components/WorkspaceList.svelte'
  import { getGlobalCtx } from '../context/global'

  const global = getGlobalCtx()

  // Get all workspace list refs reactively
  const listRefs = global.root.workspaceLists()
  
  // Map refs to WorkspaceList instances
  $: lists = $listRefs.map(ref => ({
    list: global.lists.get(ref),
    isGlobal: ref.guid === GLOBAL_INTRO_LIST_UUID
  }))
</script>

<div>
  {#each lists as { list, isGlobal } (list.id)}
    {#await list.load()}
      <div class="mb-6 animate-pulse bg-dark h-24 rounded-md"></div>
    {:then}
      <WorkspaceListComponent workspaceList={list} isGlobalList={isGlobal} />
    {:catch}
      <!-- List failed to load - skip it -->
    {/await}
  {/each}
</div>
