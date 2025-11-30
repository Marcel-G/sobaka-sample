<script lang="ts">
  import Avatar from 'svelte-boring-avatars'
  import { getWorkspace } from '../../context/workspace'

  const space = getWorkspace()

  const users = space.workspace.userStore
</script>

{#if Object.values($users).length}
  <div
    class="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg"
  >
    {#each Object.values($users) as awareness (awareness.user.uuid)}
      <div class="transition-transform hover:scale-110">
        <Avatar
          size={30}
          name={awareness.user.uuid}
          variant="beam"
          colors={['#6272a4', '#8be9fd', '#ff79c6', '#bd93f9', '#f1fa8c']}
        />
      </div>
    {/each}
  </div>
{/if}
