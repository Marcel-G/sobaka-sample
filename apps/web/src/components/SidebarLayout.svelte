<script lang="ts">
  export let isOpen = true

  function toggleSidebar() {
    isOpen = !isOpen
  }
</script>

<div class="flex h-full">
  <button
    on:click={toggleSidebar}
    class="fixed top-4 left-4 z-250 p-2 border-2 border-light w-12 rounded-lg bg-darker text-light"
  >
    {isOpen ? '←' : '→'}
  </button>

  <aside
    class="fixed top-0 left-0 w-72 h-screen bg-darker border-r border-dark transform transition-transform duration-300 ease-in-out z-200"
    class:translate-x-0={isOpen}
    class:-translate-x-full={!isOpen}
  >
    <div class="h-full flex flex-col p-4 pt-20">
      <div class="flex-none">
        <slot name="sidebar-top" />
      </div>

      <div class="flex-1 overflow-y-auto mt-4 mb-4">
        <slot name="sidebar" />
      </div>

      <div class="flex-none">
        <slot name="sidebar-bottom" />
      </div>
    </div>
  </aside>

  <div
    class="flex-1 transition-all duration-300 ease-in-out min-h-0"
    class:pl-72={isOpen}
    class:pl-0={!isOpen}
  >
    <slot />
  </div>
</div>
