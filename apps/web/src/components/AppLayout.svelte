<script lang="ts">
  import SidebarLayout from '../components/SidebarLayout.svelte'
  import NetworkIndicator from '../components/NetworkIndicator.svelte'
  import AllWorkspaces from '../components/AllWorkspaces.svelte'
</script>

<SidebarLayout>
  <svelte:fragment slot="sidebar-top">
    <slot name="sidebar-top" />
  </svelte:fragment>

  <svelte:fragment slot="sidebar">
    <AllWorkspaces />
  </svelte:fragment>

  <svelte:fragment slot="sidebar-bottom">
    <NetworkIndicator />
  </svelte:fragment>
  <main>
    <slot />
  </main>
</SidebarLayout>
