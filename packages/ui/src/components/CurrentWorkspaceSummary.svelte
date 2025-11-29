<script lang="ts">
  import { goto } from '$app/navigation'
  import { formatDistanceToNow } from 'date-fns'
  import type { Workspace } from '../models/workspace'
  import TitleInput from './TitleInput.svelte'

  export let workspace: Workspace

  $: info = workspace.info
  $: meta = workspace.meta
  $: isEditable = workspace.isEditable
</script>

<div class="flex flex-col gap-2">
  <!-- TODO: Bind seems to try update the doc even when disabled -->
  {#if $isEditable}
    <TitleInput bind:value={$info.title} />
  {:else}
    <h1 class="text-2xl font-bold block text-foreground w-full p-2">{$info.title}</h1>
  {/if}

  <div class="flex gap-2">
    <a href="/workspace/new" class="flex-1">
      <button
        class="bg-blue cursor-pointer font-semibold text-light px-3 py-2 rounded text-sm w-full"
        >New</button
      >
    </a>
    <a href="{workspace.id}/fork" class="flex-1">
      <button
        class="bg-blue cursor-pointer font-semibold text-light px-3 py-2 rounded text-sm w-full"
        >Fork</button
      >
    </a>
  </div>
  <span class="text-gray-400 text-xs">
    Updated
    <time>
      {formatDistanceToNow(new Date(meta.updatedAt))}
    </time> ago
  </span>
</div>
