<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'
  import { dev } from '$app/environment'

  import type { PageData } from './$types'
  import { delete_workspace } from '../worker/persistence'
  import * as api from '../server/api'
  import { invalidateAll } from '$app/navigation'

  export let data: PageData

  const handle_workspace_delete = async (id: string) => {
    await delete_workspace(id)
    await invalidateAll()
  }

  const handle_template_delete = async (id: string) => {
    await api.destroy(id)
    await invalidateAll()
  }
</script>

<div class="page">
  <h1>
    Sobaka Sample 🥁🐕 - <a href="https://github.com/Marcel-G/sobaka-sample">Github</a>
  </h1>

  <p>Press new in the top right to begin!</p>

  {#if data.templates.length}
    <h2>Templates:</h2>
    <ol>
      {#each data.templates as templates (templates.id)}
        <li>
          {templates.title || 'Untitled'} -
          <a href={`/workspace/template/${templates.id}`}>Use</a>
          {#if dev}
            <a href={`/workspace/template/${templates.id}/edit`}>Edit</a>
            <a href={''} on:click={() => handle_template_delete(templates.id)}>Delete</a>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}

  {#if data.workspaces.length}
    <h2>Recent workspaces:</h2>
    <ol>
      {#each data.workspaces as workspace (workspace.id)}
        <li>
          <a href={`/workspace/${workspace.id}`}>{workspace.title || 'Untitled'}</a>
          <span class="updated-at">
            Updated
            <time>
              {formatDistanceToNow(workspace.modifiedAt)}
            </time> ago
          </span>
          <a href={''} on:click={() => handle_workspace_delete(workspace.id)}>Delete</a>
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
    margin: 1rem 0;
  }

  li {
    padding: 0.125rem;
  }

  a {
    color: var(--cyan);
  }
</style>
