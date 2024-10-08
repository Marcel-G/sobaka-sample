<script lang="ts">
  import Navigation from '../components/Navigation.svelte'
  import WorkspaceList from '../components/WorkspaceList.svelte'
  import { Root } from '../models/root'

  const root = Root.init()

  const lists = root.workspaceLists()
</script>

<Navigation />
<div class="page">
  {#await root.load()}
    <!-- TODO: skeleton loading UI -->
  {:then}
    <h1>
      Sobaka Sample 🥁🐕 - <a href="https://github.com/Marcel-G/sobaka-sample">Github</a>
    </h1>

    <p>Press new in the top right to begin!</p>

    <h2>Lists:</h2>
    {#if $lists.length}
      <ul>
        {#each $lists as workspaceList (workspaceList.id)}
          {#await workspaceList.load()}
            <!-- TODO: skeleton loading UI -->
          {:then}
            <h2>Workspaces ({workspaceList.id}):</h2>
            <button on:click={() => workspaceList.new()}>Add workspace</button>
            <WorkspaceList {workspaceList} />
          {/await}
        {/each}
      </ul>
    {/if}
  {/await}
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
