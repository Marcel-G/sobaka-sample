<script lang="ts">
  import type { PageData } from './$types'

  import Workspace from '../../../workspace/Workspace.svelte'
  import { init_workspace } from '../../../workspace/context'

  export let data: PageData

  const space = init_workspace()

  if (data.workspace.id) {
    space.load_from_remote(data.workspace.id)
  }
</script>

{#key data.workspace.id}
  <Workspace />
{/key}
