<script lang="ts">
  import '../app.css'
  import { getGlobalCtx } from '../context/global'

  const global = getGlobalCtx()

  const isOnline = global.isOnline
</script>

<div class="flex items-center gap-2 mb-4 px-3">
  <div
    class:bg-green-500={$isOnline}
    class:bg-red-500={!$isOnline}
    class="w-2 h-2 rounded-full animate-pulse"
  ></div>
  <span
    class:text-green-400={$isOnline}
    class:text-red-400={!$isOnline}
    class="text-sm font-medium"
  >
    {$isOnline ? 'Connected' : 'Disconnected'}
  </span>
</div>
