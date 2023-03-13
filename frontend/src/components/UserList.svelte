<script lang="ts">
  import { get_workspace } from '../workspace/context'
  import Avatar from 'svelte-boring-avatars'

  const space = get_workspace()

  const users = space.get_user_store()
</script>

{#each Object.values($users) as awareness (awareness.user.name)}
  <Avatar
    size={30}
    name={awareness.user.uuid}
    variant="beam"
    colors={['#6272a4', '#8be9fd', '#ff79c6', '#bd93f9', '#f1fa8c']}
  />
{/each}
