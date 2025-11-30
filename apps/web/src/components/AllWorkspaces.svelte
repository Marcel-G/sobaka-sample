<script lang="ts">
  import WorkspaceList from '../components/WorkspaceList.svelte'
  import { getGlobalCtx } from '../context/global'

  const global = getGlobalCtx()

  const listRefs = global.root.workspaceLists()
  $: lists = $listRefs.map(ref => global.lists.get(ref))
</script>

<div>
  {#if $listRefs.length}
    {#each lists as list (list.id)}
      {#await list.load()}
        <!-- TODO: skeleton loading UI -->
      {:then}
        <WorkspaceList workspaceList={list} />
      {/await}
    {/each}
  {/if}
</div>
