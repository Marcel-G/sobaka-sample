<script lang="ts">
  import Navigation from '../components/Navigation.svelte'
  import WorkspaceList from '../components/WorkspaceList.svelte'
  import { getGlobalCtx } from '../context/global'

  const global = getGlobalCtx()

  const isOnline = global.isOnline

  const list_refs = global.root.workspaceLists()
  $: lists = $list_refs.map(ref => global.lists.get(ref))
</script>

<Navigation />
<div class="page">
  {#if $isOnline}
    online
  {:else}
    offline
  {/if}
  <h1>
    Sobaka Sample 🥁🐕 - <a href="https://github.com/Marcel-G/sobaka-sample">Github</a>
  </h1>

  <p>Press new in the top right to begin!</p>

  <h2>Lists:</h2>
  {#if $list_refs.length}
    <ul>
      {#each lists as list (list.id)}
        {#await list.load()}
          <!-- TODO: skeleton loading UI -->
        {:then}
          <h2>Workspaces ({list.id}):</h2>
          <button on:click={() => global.createWorkspace()}>Add workspace</button>
          <WorkspaceList workspaceList={list} />
        {/await}
      {/each}
    </ul>
  {/if}
</div>

<style>
  .page {
    margin: 1rem;
    font-family: monospace;
  }

  h1,
  h2,
  p {
    margin: 1rem 0;
  }

  ul {
    margin-left: 2rem;
  }

  a {
    color: var(--cyan);
  }
</style>
