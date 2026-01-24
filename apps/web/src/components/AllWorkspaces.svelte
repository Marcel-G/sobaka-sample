<script lang="ts">
  import WorkspaceList from '../components/WorkspaceList.svelte'
  import { getGlobalCtx } from '../context/global'

  const global = getGlobalCtx()

  // Global root lists (Intro, etc) - readonly for non-admins
  const globalListRefs = global.globalRoot.workspaceLists()
  $: globalLists = $globalListRefs.map(ref => global.lists.get(ref))

  // User's personal lists (My Workspaces) - editable
  const userListRefs = global.root.workspaceLists()
  $: userLists = $userListRefs.map(ref => global.lists.get(ref))
</script>

<div>
  <!-- Global workspace lists (Intro) - admins can edit -->
  {#if $globalListRefs.length}
    {#each globalLists as list (list.id)}
      {#await list.load()}
        <!-- TODO: skeleton loading UI -->
      {:then}
        <WorkspaceList workspaceList={list} allowAdminEdit={true} />
      {/await}
    {/each}
  {/if}

  <!-- User's workspace lists (My Workspaces) -->
  {#if $userListRefs.length}
    {#each userLists as list (list.id)}
      {#await list.load()}
        <!-- TODO: skeleton loading UI -->
      {:then}
        <WorkspaceList workspaceList={list} />
      {/await}
    {/each}
  {/if}
</div>
