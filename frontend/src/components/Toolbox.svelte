<script lang="ts">
  import clamp from 'lodash/clamp'
  import { get_workspace } from '../context/workspace'
  import { MODULES, type ModuleUI } from '../modules'
  import { into_grid_coords } from '../modules/shared/Panel.svelte'
  import { onMount } from 'svelte'

  export let position = { x: 0, y: 0 }
  export let onClose: () => void

  const { workspace } = get_workspace()

  let search = ''
  let selected_index = 0
  let selection_refs: HTMLButtonElement[] = []
  let input_ref: HTMLInputElement;

  const dumb_fuzzy =
    (query: string) =>
    (module_name: string): boolean => {
      if (!query.trim()) {
        return true
      }

      return module_name.toLowerCase().includes(query.trim().toLowerCase())
    }

  $: list = (Object.keys(MODULES) as ModuleUI[]).filter(dumb_fuzzy(search))
  $: selected_index = clamp(selected_index, 0, list.length - 1)
  $: selection_refs[selected_index]?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest'
  })

  onMount(() => {
    input_ref.focus()
  })

  function handle_create(type: ModuleUI) {
    workspace.create_module(type, into_grid_coords(position))
    onClose()
  }

  const handle_key_down = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'Enter':
        if (list[selected_index]) {
          handle_create(list[selected_index])
        } else {
          onClose()
        }
        break
      case 'Escape':
        onClose()
        break
      case 'ArrowUp':
        selected_index -= 1
        break
      case 'ArrowDown':
        selected_index += 1
        break
    }
  }
</script>

<div
  aria-hidden="true"
  on:click={onClose}
  class="fixed inset-0 bg-black/30 z-300 animate-in fade-in duration-1000"></div>

<div class="absolute inset-0 p-4 flex z-310 items-center justify-center pointer-events-none">
  <div
    class="bg-white dark:bg-darker w-full max-w-[500px] rounded-lg shadow-xl overflow-hidden"
  >
    <div class="p-4 border-b border-zinc-200 dark:border-zinc-800">
      <input
        bind:this={input_ref}
        bind:value={search}
        on:blur={() => input_ref?.focus()}
        on:keydown={handle_key_down}
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
            bind:this={selection_refs[index]}
            class:selected={index === selected_index}
            on:click={() => handle_create(module)}
            class="w-full px-4 py-2 rounded-lg text-left font-mono mb-1
                   bg-zinc-100 dark:bg-dark hover:bg-zinc-200 dark:hover:bg-blue-900/20
                   text-zinc-900 dark:text-zinc-100 transition-colors
                   {index === selected_index ? 'bg-zinc-200 dark:bg-blue-900/30' : ''}"
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
