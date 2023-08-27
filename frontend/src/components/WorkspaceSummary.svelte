<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'
  import { invalidateAll } from '$app/navigation'
  import { SobakaWorkspace } from '../models/Workspace'

  export let workspace: SobakaWorkspace

  const handle_delete = async () => {
    // if (meta.type === 'local') {
    //   await remove_local(meta.cid)
    // } else {
    //   await remove_remote(meta.cid)
    // }
    await invalidateAll()
  }

  const href = `/workspace/draft/${workspace.metadata.id}`;
</script>

<li>
  <a {href}>{workspace.metadata.name || 'Untitled'}</a>
  <span class="updated-at">
    Updated
    <time>
      {formatDistanceToNow(new Date(workspace.metadata.updated))}
    </time> ago
  </span>
  <a href={''} on:click={handle_delete}>Delete</a>
  <slot />
</li>

<style>
  .updated-at {
    font-size: 0.8em;
  }

  li {
    padding: 0.125rem;
  }

  a {
    color: var(--cyan);
  }
</style>
