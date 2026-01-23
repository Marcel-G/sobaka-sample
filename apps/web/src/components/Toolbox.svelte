<script lang="ts">
  import clamp from 'lodash/clamp'
  import { getWorkspace } from '../context/workspace'
  import { pluginRegistry } from '../plugins'
  import { intoGridCoords } from '@sobaka/ui/modules/shared/Panel.svelte'
  import { onMount } from 'svelte'

  interface Props {
    position?: { x: number; y: number }
    onClose: () => void
  }

  let { position = { x: 0, y: 0 }, onClose }: Props = $props()

  const { workspace } = getWorkspace()

  let search = $state('')
  let selectedIndex = $state(0)
  let selectionRefs: HTMLButtonElement[] = $state([])
  let inputRef: HTMLInputElement

  const moduleTypes = pluginRegistry.getTypes()

  const dumbFuzzy =
    (query: string) =>
    (moduleName: string): boolean => {
      if (!query.trim()) {
        return true
      }

      return moduleName.toLowerCase().includes(query.trim().toLowerCase())
    }

  const list = $derived(moduleTypes.filter(dumbFuzzy(search)))
  const clampedIndex = $derived(clamp(selectedIndex, 0, list.length - 1))

  $effect(() => {
    selectionRefs[clampedIndex]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest'
    })
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
        if (list[clampedIndex]) {
          handleCreate(list[clampedIndex])
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
  onclick={onClose}
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
        onblur={() => inputRef?.focus()}
        onkeydown={handleKeyDown}
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
            class:selected={index === clampedIndex}
            onclick={() => handleCreate(module)}
            class="w-full px-4 py-2 rounded-lg text-left font-mono mb-1
                   bg-zinc-100 dark:bg-dark hover:bg-zinc-200 dark:hover:bg-blue-900/20
                   text-zinc-900 dark:text-zinc-100 transition-colors
                   {index === clampedIndex ? 'bg-zinc-200 dark:bg-blue-900/30' : ''}"
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
