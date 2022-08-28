<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'

  import type { PageData } from './$types'

  export let data: PageData
</script>

<div class="page">
  <h1>
    Sobaka Sample 🥁🐕 - <a href="https://github.com/Marcel-G/sobaka-sample">Github</a>
  </h1>

  <p>Press new in the top right to begin!</p>

  {#if data.workspaces.length}
    <h2>Recent workspaces:</h2>
    <ol>
      {#each data.workspaces as workspace}
        <li>
          <a href={`/workspace/${workspace.id}`}>{workspace.title || 'Untitled'}</a>
          <span class="updated-at">
            Updated
            <time datetime={workspace.modifiedAt.toISOString()}>
              {formatDistanceToNow(workspace.modifiedAt)}
            </time> ago
          </span>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .page {
    margin: 1rem;
    font-family: monospace;
  }
  .updated-at {
    font-size: 0.8em;
  }
  ol {
    list-style-type: none;
  }

  h1,
  h2,
  p {
    margin-bottom: 1rem;
  }

  li {
    padding: 0.125rem;
  }

  a {
    color: var(--cyan);
  }
</style>
