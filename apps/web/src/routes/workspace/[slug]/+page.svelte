<script lang="ts">
  import type { PageData } from './$types'

  import WorkspaceContainer from '../../../workspace/WorkspaceContainer.svelte'
  import { getGlobalCtx } from '../../../context/global'
  import { type SubDocReference } from '@sobaka/state/util/subdoc'
  import type { Workspace } from '@sobaka/state/models/workspace'
  import type { LoadingState } from '@sobaka/state/models/syncedDoc'
  import CurrentWorkspaceSummary from '../../../components/CurrentWorkspaceSummary.svelte'
  import AppLayout from '../../../components/AppLayout.svelte'
  import LoadingScreen from '@sobaka/ui/components/LoadingScreen.svelte'

  let { data }: { data: PageData } = $props()

  const context = getGlobalCtx()

  const workspace = $derived(
    context.workspaces.get({
      guid: data.workspace.id
    } as SubDocReference<Workspace>)
  )

  // Use the new loadWithRetry for better UX
  const loadingState = $derived(workspace.loadWithRetry())
  
  // Reactive loading state
  let currentState: LoadingState = $state({ status: 'loading', message: 'Looking for workspace...' })
  
  $effect(() => {
    const unsubscribe = loadingState.subscribe(state => {
      currentState = state
    })
    return unsubscribe
  })
</script>

<AppLayout>
  <svelte:fragment slot="sidebar-top">
    {#if currentState.status === 'loaded'}
      <div class="mb-6 border-b border-dark pb-4">
        <CurrentWorkspaceSummary {workspace} />
      </div>
    {:else}
      <div class="sidebar-loading">
        <div class="loading-placeholder"></div>
      </div>
    {/if}
  </svelte:fragment>

  {#if currentState.status === 'loading'}
    <LoadingScreen 
      message="Loading workspace" 
      status={currentState.message} 
    />
  {:else if currentState.status === 'not_found'}
    <LoadingScreen 
      message={currentState.message}
      status={currentState.retrying ? "Still searching the network..." : ""}
      showSpinner={currentState.retrying}
    />
  {:else if currentState.status === 'error'}
    <div class="error-container">
      <h2>Something went wrong</h2>
      <p>{currentState.message}</p>
    </div>
  {:else}
    {#key workspace.id}
      <WorkspaceContainer {workspace} />
    {/key}
  {/if}
</AppLayout>

<style>
  .sidebar-loading {
    padding: 1rem 0;
  }
  
  .loading-placeholder {
    height: 60px;
    background: var(--color-dark);
    border-radius: 4px;
    opacity: 0.5;
  }
  
  .error-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    color: var(--color-light);
  }
  
  .error-container h2 {
    font-size: 1.25rem;
    font-weight: 500;
    margin: 0;
  }
  
  .error-container p {
    color: var(--color-medium);
    margin: 0;
  }
</style>
