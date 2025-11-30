<script context="module" lang="ts">
  export const intoGridCoords = (coords: {
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
  import { writable } from 'svelte/store'

  import { relativeToElement, useDrag } from '../../actions/drag'
  import type { OnDrag } from '../../actions/drag'
  import { twMerge } from 'tailwind-merge'
  import type { PanelProps } from '../../types/props'

  let {
    name,
    disabled = false,
    height = 0,
    width = 0,
    position = writable({ x: 0, y: 0 }),
    onClose = null,
    onClone = null,
    onDrag = null,
    registerElement = null,
    unregisterElement = null,
    children,
    inputs,
    outputs
  }: PanelProps = $props()

  let element: HTMLElement

  const col = $derived(`${$position.x + 1} / span ${width}`)
  const row = $derived(`${$position.y + 1} / span ${height}`)

  // Register element when it's bound, unregister on cleanup
  $effect(() => {
    if (registerElement && element) {
      // Wait for next frame to ensure element is rendered and positioned
      requestAnimationFrame(() => {
        registerElement(element)
      })
      
      // Return cleanup function
      return () => {
        unregisterElement?.()
      }
    }
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

  const handleDrag: OnDrag = (event, origin, element) => {
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
      const { x: xIn, y: yIn } = relativeToElement(event, origin, workspaceElement)

      let { x, y } = intoGridCoords({ x: xIn, y: yIn })
      if (x < 0 || y < 0) {
        return
      }
      onDrag(x, y)
    }
  }
</script>

<div
  use:useDrag={{ onDrag: handleDrag }}
  bind:this={element}
  class={twMerge('panel', classes.panel, disabled && classes.disabled)}
  style={`grid-column: ${col}; grid-row: ${row};`}
  data-kind="module"
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
            onclick={onClone}>+</button
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
            onclick={onClose}>x</button
          >
        {/if}
      </span>
    {/if}
  </div>
  {#if children}
    {@render children()}
  {/if}
  <div class={classes.inputs}>
    {#if inputs}
      {@render inputs()}
    {/if}
  </div>
  <div class={classes.outputs}>
    {#if outputs}
      {@render outputs()}
    {/if}
  </div>
</div>
