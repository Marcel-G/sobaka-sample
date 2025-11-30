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
  import { writable, type Readable } from 'svelte/store'

  import { relative_to_element, useDrag } from '../../actions/drag'
  import type { OnDrag } from '../../actions/drag'
  import { twMerge } from 'tailwind-merge'

  export let name: string
  export let disabled = false
  export let height = 0
  export let width = 0
  
  // Position and ID props
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  
  // Callback props - make the component dumb
  export let onClose: ((id: string) => void) | null = null
  export let onClone: ((id: string) => void) | null = null
  export let onDrag: ((id: string, x: number, y: number) => void) | null = null
  export let registerElement: ((id: string, element: HTMLElement) => void) | null = null
  export let unregisterElement: ((id: string) => void) | null = null

  // For backwards compatibility with context-based usage
  const id = moduleId

  let element: HTMLElement

  $: col = `${$position.x + 1} / span ${width}`
  $: row = `${$position.y + 1} / span ${height}`

  $: {
    // position values must be subscribed to in here to trigger reactivity
    // even if we don't really need the values of x and y
    if (registerElement && element && ($position.x !== 0 || $position.y !== 0)) {
      requestAnimationFrame(() => {
        registerElement(id, element)
      })
    }
  }

  onDestroy(() => {
    unregisterElement?.(id)
  })

  const classes = {
    panel:
      'bg-module-background shadow-lg rounded-lg p-2 cursor-move border-box select-none relative z-5 border-2 border-t-18 border-module-accent',
    disabled:
      'filter grayscale-65 contrast-130 pointer-events-none select-none cursor-none',
    bar: 'absolute left-0 top-0 right-0 text-xs pl-1 transform -translate-y-full flex justify-between items-end pointer-events-none',
    barButton: `font-mono border-0 bg-module-background text-light w-6 transition-opacity duration-125 pointer-events-auto`,
    barButtonHover: 'hover:opacity-75',
    barButtonActive: `active:opacity-0`,
    name: 'uppercase font-mono font-bold text-dark mix-blend-difference overflow-hidden text-ellipsis',
    inputs: 'absolute top-2 left-0 transform -translate-x-1/2 flex flex-col',
    outputs: 'absolute top-2 right-0 transform translate-x-1/2 flex flex-col'
  }

  const handle_drag: OnDrag = (event, origin, element) => {
    if (disabled || !onDrag) return true

    // Find the first parent with data-kind="workspace"
    let workspaceElement = element
    while (
      workspaceElement &&
      workspaceElement.getAttribute('data-kind') !== 'workspace'
    ) {
      if (workspaceElement.parentElement) {
        workspaceElement = workspaceElement.parentElement
      } else {
        break
      }
    }

    if (workspaceElement instanceof Element) {
      const { x: x_in, y: y_in } = relative_to_element(event, origin, workspaceElement)

      let { x, y } = into_grid_coords({ x: x_in, y: y_in })
      if (x < 0 || y < 0) {
        return
      }
      onDrag(id, x, y)
    }
  }
</script>

<div
  use:useDrag={{ onDrag: handle_drag }}
  bind:this={element}
  class={twMerge('panel', classes.panel, disabled && classes.disabled)}
  style={`grid-column: ${col}; grid-row: ${row};`}
  data-kind="module"
  data-module-id={id}
>
  <div class={classes.bar}>
    <span class={classes.name}>{name}</span>
    {#if !disabled && (onClone || onClose)}
      <span class="actions flex">
        {#if onClone}
          <button
            class={twMerge(
              classes.barButton,
              classes.barButtonHover,
              classes.barButtonActive
            )}
            on:click={() => onClone?.(id)}>+</button
          >
        {/if}
        {#if onClose}
          <button
            class={twMerge(
              classes.barButton,
              classes.barButtonHover,
              classes.barButtonActive,
              'rounded-tr-[calc(var(--radius-lg)-2px)]'
            )}
            on:click={() => onClose?.(id)}>x</button
          >
        {/if}
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
