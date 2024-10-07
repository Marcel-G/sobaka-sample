<script lang="ts">
  import Navigation from '../components/Navigation.svelte'
  import WorkspaceList from '../components/WorkspaceList.svelte'
  import { get_root } from '../context/root'

  const root = get_root()

  const lists = root.workspaceLists()
</script>

<Navigation />
<div class="page">
  <h1>
    Sobaka Sample 🥁🐕 - <a href="https://github.com/Marcel-G/sobaka-sample">Github</a>
  </h1>

  <p>Press new in the top right to begin!</p>

  <h2>Lists:</h2>
  {#if $lists.length}
    <ul>
      {#each $lists as workspaceList (workspaceList.id)}
        <h2>Workspaces ({workspaceList.id}):</h2>
        <button on:click={() => workspaceList.new()}>Add workspace</button>
        <WorkspaceList {workspaceList} />
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
