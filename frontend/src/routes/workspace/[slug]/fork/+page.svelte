<script lang="ts">
  import type { PageData } from './$types'
  import { onMount } from 'svelte'
  import { getGlobalCtx } from '../../../../context/global'
  import { goto } from '$app/navigation'
  import type { SubDocReference } from '../../../../util/subdoc'
  import type { Workspace } from '../../../../models/workspace'

  export let data: PageData

  onMount(async () => {
    const context = getGlobalCtx()

    const workspace = context.workspaces.get({
      guid: data.workspace.id
    } as SubDocReference<Workspace>)

    await workspace.load()
    const forked = context.createFork(workspace)

    await goto(`/workspace/${forked.id}`, { replaceState: true })
  })
</script>
