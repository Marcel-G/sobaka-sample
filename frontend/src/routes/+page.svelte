<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'

  import type { PageData } from './$types'

  export let data: PageData
</script>

<h1>Welcome</h1>

<p>Sobaka sample, try it out</p>

<ol>
  {#each data.workspaces as workspace}
    <li>
      <a href={`/workspace/${workspace.id}`}>{workspace.title} ({workspace.id})</a>
      Updated
      <time datetime={workspace.modifiedAt.toISOString()}>
        {formatDistanceToNow(workspace.modifiedAt)}
      </time> ago
    </li>
  {/each}
</ol>
