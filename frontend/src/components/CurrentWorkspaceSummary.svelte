<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Workspace } from '../models/workspace'
  import TitleInput from './TitleInput.svelte'

  export let workspace: Workspace

  const info = workspace.info
  const isEditable = workspace.isEditable
</script>

<div class="flex flex-col gap-2">
  <!-- TODO: Bind seems to try update the doc even when disabled -->
  {#if $isEditable}
    <TitleInput bind:value={$info.title} />
  {:else}
    <h1 class="text-2xl font-bold">{$info.title}</h1>
  {/if}
  <div class="flex gap-2">
    <div class="flex-1">
      <a href="/workspace/new">
        <button class="bg-blue cursor-pointer font-semibold text-light px-3 py-2 rounded text-sm w-full">New</button>
      </a>
    </div>
    <div class="flex-1 flex">
      <button
        onclick={() => {
          const forked = workspace.fork()
          // TODO: add to user list
          goto(`/workspace/${forked.id}`)
        }}
        class="bg-blue cursor-pointer font-semibold text-light px-3 py-2 rounded text-sm w-full"
      >
        Fork
      </button>
    </div>
  </div>
</div>
