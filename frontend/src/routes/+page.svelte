<script lang="ts">
  import type { PageData } from './$types'
  import Navigation from '../components/Navigation.svelte'
  import WorkspaceSummary from '../components/WorkspaceSummary.svelte'

  export let data: PageData
</script>

<Navigation />
<div class="page">
  <h1>
    Sobaka Sample 🥁🐕 - <a href="https://github.com/Marcel-G/sobaka-sample">Github</a>
  </h1>

  <p>Press new in the top right to begin!</p>

  {#if data.orphan_drafts.length}
    <h2>Workspaces:</h2>
    <ul>
      {#each data.orphan_drafts as workspace (workspace.cid)}
        <WorkspaceSummary meta={workspace} />
      {/each}
    </ul>
  {/if}

  <!-- {#if data.shared_with_drafts.length} -->
  <!--   <h2>Shared workspaces:</h2> -->
  <!--   <ul> -->
  <!--     {#each data.shared_with_drafts as pair (pair.remote.cid)} -->
  <!--       <WorkspaceSummary meta={pair.remote}> -->
  <!--         <ul> -->
  <!--           {#each pair.drafts as draft (draft.cid)} -->
  <!--             <WorkspaceSummary meta={draft} /> -->
  <!--           {/each} -->
  <!--         </ul> -->
  <!--       </WorkspaceSummary> -->
  <!--     {/each} -->
  <!--   </ul> -->
  <!-- {/if} -->
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
