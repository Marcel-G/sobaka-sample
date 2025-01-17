<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'
  import type { Workspace } from '../models/workspace'

  export let workspace: Workspace

  const meta = workspace.meta
  const info = workspace.info

  const href = `/workspace/${workspace.id}`
</script>

<li>
  <a {href}>{$info.title}</a>
  <span class="updated-at">
    Updated
    <time>
      {formatDistanceToNow(new Date(meta.updatedAt))}
    </time> ago
  </span>
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
