<script lang="ts">
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  import WorkspaceContainer from '../../../workspace/WorkspaceContainer.svelte'
  import { getGlobalCtx } from '../../../context/global'
  import { type SubDocReference } from '@sobaka/state/util/subdoc'
  import type { Workspace } from '@sobaka/state/models/workspace'
  import CurrentWorkspaceSummary from '../../../components/CurrentWorkspaceSummary.svelte'
  import AppLayout from '../../../components/AppLayout.svelte'
  import LoadingScreen from '@sobaka/ui/components/LoadingScreen.svelte'

  const TIMEOUT = 30_000 // 30 seconds

  let { data }: { data: PageData } = $props()

  const context = getGlobalCtx()

  const workspace = $derived(
    context.workspaces.get({
      guid: data.workspace.id
    } as SubDocReference<Workspace>)
  )

  // Simple loading promise
  const loading = $derived(workspace.load())
  
  // Track if loaded
  let isLoaded = $state(false)
  
  $effect(() => {
    loading.then(() => {
      isLoaded = true
    }).catch(() => {
      // Will be handled by timeout
    })
  })

  // Timeout - redirect to homepage if not loaded after 30s
  onMount(() => {
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        goto('/')
      }
    }, TIMEOUT)
    
    return () => clearTimeout(timeout)
  })
</script>

<AppLayout>
  <svelte:fragment slot="sidebar-top">
    {#if isLoaded}
      <div class="mb-6 border-b border-dark pb-4">
        <CurrentWorkspaceSummary {workspace} />
      </div>
    {:else}
      <!-- Show New button while loading, but not Fork -->
      <div class="flex flex-col gap-2 mb-6 border-b border-dark pb-4">
        <div class="loading-title"></div>
        <a href="/workspace/new">
          <button class="bg-blue cursor-pointer font-semibold text-light px-3 py-2 rounded text-sm w-full">
            New
          </button>
        </a>
      </div>
    {/if}
  </svelte:fragment>

  {#if isLoaded}
    {#key workspace.id}
      <WorkspaceContainer {workspace} />
    {/key}
  {:else}
    <LoadingScreen message="Looking for workspace..." />
  {/if}
</AppLayout>

<style>
  .loading-title {
    height: 2.5rem;
    background: var(--color-dark);
    border-radius: 4px;
    opacity: 0.3;
  }
</style>
