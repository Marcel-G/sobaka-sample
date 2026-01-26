<script lang="ts">
  import type { PageData } from './$types'
  import { onMount } from 'svelte'
  import { getGlobalCtx } from '../../../../context/global'
  import { goto } from '$app/navigation'
  import type { SubDocReference } from '@sobaka/state/util/subdoc'
  import type { Workspace } from '@sobaka/state/models/workspace'

  export let data: PageData

  onMount(async () => {
    const context = getGlobalCtx()

    const workspace = context.workspaces.get({
      guid: data.workspace.id
    } as SubDocReference<Workspace>)

    try {
      await workspace.load()
      const forked = context.createFork(workspace)
      await goto(`/workspace/${forked.id}`, { replaceState: true })
    } catch {
      // Invalid document type or load failure - redirect home
      await goto('/')
    }
  })
</script>
