<script context="module" lang="ts">
  export const into_grid_coords = (coords: {
    x: number
    y: number
  }): { x: number; y: number } => {
    const grid = 0.5 * 16 // grid is 0.5rem;
    const gap = 0.5 * 16 // grid is 0.5rem
    return {
      x: Math.round(coords.x / (grid + gap)),
      y: Math.round(coords.y / (grid + gap))
    }
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'

  import { relative_to_element, useDrag } from '../../actions/drag'
  import type { OnDrag } from '../../actions/drag'
  import { get_workspace } from '../../context/workspace'
  import { get_module_context } from '../context'
  import ThemeProvider, { type ModuleTheme } from '../ThemeProvider.svelte'
  import { twMerge } from 'tailwind-merge'

  export let theme: Partial<ModuleTheme> = {}
  export let name: string
  export let disabled = false
  export let height = 0
  export let width = 0

  const { workspace } = get_workspace()
  const { id } = get_module_context()
  // const { primary } = theme

  const position = workspace.module_position(id)

  let element: HTMLElement

  $: col = `${$position.x + 1} / span ${width}`
  $: row = `${$position.y + 1} / span ${height}`

  $: {
    // position values must be subscribed to in here to trigger reactivity
    // even if we don't really need the values of x and y
    if (element && ($position.x !== 0 || $position.y !== 0)) {
      requestAnimationFrame(() => {
        workspace.positions.registerModule(id, element)
      })
    }
  }

  onDestroy(() => {
    workspace.positions.removeModule(id)
  })

  const classes = {
    panel:
      'shadow-lg rounded-lg p-2 cursor-move border-box select-none relative z-5 border-2 border-t-[18px] border-zinc-200 dark:border-zinc-900',
    disabled:
      'filter grayscale-65 contrast-130 pointer-events-none select-none cursor-none',
    bar: 'absolute left-0 top-0 right-0 text-xs pl-1 transform -translate-y-full flex justify-between items-end pointer-events-none',
    barButton: `font-mono border-0 bg-white text-zinc-900 w-6 transition-opacity duration-125 pointer-events-auto`,
    barButtonHover: 'hover:opacity-75',
    barButtonActive: `active:opacity-0 active:text-zinc-700 dark:active:text-zinc-300`,
    name: 'uppercase font-mono font-bold text-zinc-900 dark:text-zinc-200 mix-blend-difference overflow-hidden text-ellipsis',
    inputs: 'absolute top-2 left-0 transform -translate-x-1/2 flex flex-col',
    outputs: 'absolute top-2 right-0 transform translate-x-1/2 flex flex-col'
  }

  const handle_drag: OnDrag = (event, origin, element) => {
    if (disabled) return true
    const parent = element.parentElement
    if (parent instanceof Element) {
      const { x: x_in, y: y_in } = relative_to_element(event, origin, parent)

      let { x, y } = into_grid_coords({ x: x_in, y: y_in })
      if (x < 0 || y < 0) {
        return
      }
      workspace.move_module(id, x, y)
    }
  }
</script>

<ThemeProvider {theme}>
  <div
    use:useDrag={{ onDrag: handle_drag }}
    bind:this={element}
    class={twMerge(classes.panel, disabled && classes.disabled)}
    style={`grid-column: ${col}; grid-row: ${row};`}
    data-kind="module"
    data-module-id={id}
  >
    <div class={classes.bar}>
      <span class={classes.name}>{name}</span>
      {#if !disabled}
        <span class="actions flex">
          <button
            class={twMerge(
              classes.barButton,
              classes.barButtonHover,
              classes.barButtonActive
            )}
            on:click={() => workspace.clone_module(id)}>+</button
          >
          <button
            class={twMerge(
              classes.barButton,
              classes.barButtonHover,
              classes.barButtonActive,
              'rounded-tr-lg'
            )}
            on:click={() => workspace.remove_module(id)}>x</button
          >
        </span>
      {/if}
    </div>
    <slot />
    <div class={classes.inputs}>
      <slot class="vertical" name="inputs" />
    </div>
    <div class={classes.outputs}>
      <slot class="vertical" name="outputs" />
    </div>
  </div>
</ThemeProvider>
