<script lang="ts">
  import clamp from 'lodash/clamp'
  import { getWorkspace } from '../context/workspace'
  import { MODULES } from '@sobaka/ui/modules'
  import { intoGridCoords } from '@sobaka/ui/modules/shared/Panel.svelte'
  import { onMount } from 'svelte'

  export let position = { x: 0, y: 0 }
  export let onClose: () => void

  const { workspace } = getWorkspace()

  let search = ''
  let selectedIndex = 0
  let selectionRefs: HTMLButtonElement[] = []
  let inputRef: HTMLInputElement

  const dumbFuzzy =
    (query: string) =>
    (moduleName: string): boolean => {
      if (!query.trim()) {
        return true
      }

      return moduleName.toLowerCase().includes(query.trim().toLowerCase())
    }

  $: list = Object.keys(MODULES).filter(dumbFuzzy(search))
  $: selectedIndex = clamp(selectedIndex, 0, list.length - 1)
  $: selectionRefs[selectedIndex]?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest'
  })

  onMount(() => {
    inputRef.focus()
  })

  function handleCreate(type: string) {
    workspace.createModule(type, intoGridCoords(position))
    onClose()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'Enter':
        if (list[selectedIndex]) {
          handleCreate(list[selectedIndex])
        } else {
          onClose()
        }
        break
      case 'Escape':
        onClose()
        break
      case 'ArrowUp':
        selectedIndex -= 1
        break
      case 'ArrowDown':
        selectedIndex += 1
        break
    }
  }
</script>

<div
  aria-hidden="true"
  on:click={onClose}
  class="fixed inset-0 bg-black/30 z-300 animate-in fade-in duration-1000"
></div>

<div
  class="absolute inset-0 p-4 flex z-310 items-center justify-center pointer-events-none"
>
  <div
    class="bg-darker pointer-events-auto w-full max-w-[500px] rounded-lg shadow-xl overflow-hidden"
  >
    <div class="p-4 border-b border-zinc-200 dark:border-zinc-800">
      <input
        bind:this={inputRef}
        bind:value={search}
        on:blur={() => inputRef?.focus()}
        on:keydown={handleKeyDown}
        class="w-full px-4 py-2 rounded-lg border-2 border-zinc-200 dark:border-zinc-800
               bg-white dark:bg-darker text-zinc-900 dark:text-zinc-100
               focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400
               font-mono"
        placeholder="Search modules..."
      />
    </div>

    <div class="relative">
      <div
        class="absolute top-0 left-0 right-0 h-4 bg-linear-to-b from-white dark:from-darker to-transparent pointer-events-none z-10"
      ></div>
      <div class="max-h-[400px] overflow-y-auto p-2">
        {#each list as module, index}
          <button
            bind:this={selectionRefs[index]}
            class:selected={index === selectedIndex}
            on:click={() => handleCreate(module)}
            class="w-full px-4 py-2 rounded-lg text-left font-mono mb-1
                   bg-zinc-100 dark:bg-dark hover:bg-zinc-200 dark:hover:bg-blue-900/20
                   text-zinc-900 dark:text-zinc-100 transition-colors
                   {index === selectedIndex ? 'bg-zinc-200 dark:bg-blue-900/30' : ''}"
          >
            {module}
          </button>
        {/each}
      </div>

      <div
        class="absolute bottom-0 left-0 right-0 h-4 bg-linear-to-t from-white dark:from-darker to-transparent pointer-events-none z-10"
      ></div>
    </div>
  </div>
</div>
