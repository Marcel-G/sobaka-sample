<script lang="ts">
  import WorkspaceList from '../components/WorkspaceList.svelte'
  import { getGlobalCtx } from '../context/global'

  const global = getGlobalCtx()

  const list_refs = global.root.workspaceLists()
  $: lists = $list_refs.map(ref => global.lists.get(ref))
</script>

<div>
  <h2 class="text-gray-200 text-lg font-semibold mb-3">Recent Workspaces</h2>
  {#if $list_refs.length}
    {#each lists as list (list.id)}
      {#await list.load()}
        <!-- TODO: skeleton loading UI -->
      {:then}
        <WorkspaceList workspaceList={list} />
      {/await}
    {/each}
  {/if}
</div>
