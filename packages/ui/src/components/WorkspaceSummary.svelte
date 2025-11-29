<script lang="ts">
  import { formatDistanceToNow } from 'date-fns'
  import type { Workspace } from '../models/workspace'

  export let workspace: Workspace

  const meta = workspace.meta
  const info = workspace.info

  const href = `/workspace/${workspace.id}`
</script>

<li class="group py-2 px-3 hover:bg-dark rounded-md transition-colors">
  <a {href} class="block text-cyan font-medium mb-1">{$info.title}</a>
  <div class="flex justify-between items-center">
    <span class="text-gray-400 text-xs">
      Updated
      <time>
        {formatDistanceToNow(new Date(meta.updatedAt))}
      </time> ago
    </span>
    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
      <slot />
    </div>
  </div>
</li>
