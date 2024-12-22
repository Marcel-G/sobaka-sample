<script lang="ts">
  import Avatar from 'svelte-boring-avatars'
  import { get_workspace } from '../../context/workspace'

  const space = get_workspace()

  const users = space.workspace.user_store
</script>

{#each Object.values($users) as awareness (awareness.user.uuid)}
  <Avatar
    size={30}
    name={awareness.user.uuid}
    variant="beam"
    colors={['#6272a4', '#8be9fd', '#ff79c6', '#bd93f9', '#f1fa8c']}
  />
{/each}
