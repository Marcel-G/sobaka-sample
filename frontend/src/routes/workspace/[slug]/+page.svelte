<script lang="ts">
  import type { PageData } from './$types'

  import { WorkspaceManager } from '../../../models/manager'
  import Workspace from '../../../workspace/Workspace.svelte'
  import { init_workspace } from '../../../workspace/context'

  export let data: PageData

  if (data.workspace.id) {
    const doc = WorkspaceManager.fromData(data.managerData)
      .storageSynced()
      .loadWorkspace(data.workspace.id)

    init_workspace(doc)
  }
</script>

{#key data.workspace.id}
  <Workspace />
{/key}
