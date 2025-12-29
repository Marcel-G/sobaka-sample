<script lang="ts">
  import type { Workspace } from '@sobaka/state/models/workspace'
  import { initWorkspaceContext } from '../context/workspace'
  import WorkspaceView from './Workspace.svelte'

  let { workspace }: { workspace: Workspace } = $props()

  initWorkspaceContext(workspace)
</script>

<WorkspaceView />
