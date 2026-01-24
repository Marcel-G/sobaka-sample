<script lang="ts">
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'

  import WorkspaceContainer from '../../../workspace/WorkspaceContainer.svelte'
  import { getGlobalCtx } from '../../../context/global'
  import { type SubDocReference } from '@sobaka/state/util/subdoc'
  import type { Workspace } from '@sobaka/state/models/workspace'
  import CurrentWorkspaceSummary from '../../../components/CurrentWorkspaceSummary.svelte'
  import AppLayout from '../../../components/AppLayout.svelte'

  let { data }: { data: PageData } = $props()

  const context = getGlobalCtx()

  const workspace = $derived(
    context.workspaces.get({
      guid: data.workspace.id
    } as SubDocReference<Workspace>)
  )

  // Track if loaded
  let isLoaded = $state(false)
  
  // Load workspace - redirects home on timeout (30s)
  $effect(() => {
    workspace.load()
      .then(() => {
        isLoaded = true
      })
      .catch(() => {
        // Timeout hit - redirect to homepage
        goto('/')
      })
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
    <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-grid">
      <div class="max-w-2xl text-center space-y-8">
        <div class="spinner"></div>
        
        <p class="text-xl text-gray-300">Looking for workspace...</p>
        
        <a href="/workspace/new">
          <button
            class="bg-blue text-light px-8 py-4 rounded-lg cursor-pointer
            font-semibold text-lg transition-colors duration-200 shadow-lg"
          >
            Create New Workspace
          </button>
        </a>
      </div>
    </div>
  {/if}
</AppLayout>

<style>
  .loading-title {
    height: 2.5rem;
    background: var(--color-dark);
    border-radius: 4px;
    opacity: 0.3;
  }

  .bg-grid {
    background: conic-gradient(from 90deg at 1px 1px, #0000 90deg, var(--color-dark) 0) 0
      0 / 1rem 1rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-dark);
    border-top-color: var(--color-purple);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
