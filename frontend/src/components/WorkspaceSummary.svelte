<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'
  import { Workspace } from '../models/workspace'

  export let workspace: Workspace

  const meta = workspace.meta

  const href = `/workspace/${workspace.id}`
</script>

<li>
  <a {href}>{$meta.title}</a>
  <span class="updated-at">
    {#if $meta.updatedAt}
      Updated
      <time>
        {formatDistanceToNow(new Date($meta.updatedAt))}
      </time> ago
    {/if}
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
