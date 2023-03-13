<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'
  import { invalidateAll } from '$app/navigation'
  import { remove_local, remove_remote, WorkspaceMetaId } from '../worker/state'

  export let meta: WorkspaceMetaId

  const handle_delete = async () => {
    if (meta.type === 'local') {
      await remove_local(meta.cid)
    } else {
      await remove_remote(meta.cid)
    }
    await invalidateAll()
  }

  const href =
    meta.type === 'local' ? `/workspace/draft/${meta.cid}` : `/workspace/${meta.cid}`

  formatDistanceToNow
</script>

<li>
  <a {href}>{meta.title || 'Untitled'}</a>
  {#if meta.type === 'local'}
    (Draft)
  {/if}
  <span class="updated-at">
    Updated
    <time>
      {formatDistanceToNow(new Date(meta.updatedAt))}
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
