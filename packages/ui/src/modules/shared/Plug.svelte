<script lang="ts">
  import { onDestroy } from 'svelte'
  import { writable, type Readable } from 'svelte/store'
  import Tooltip from '../../components/Tooltip.svelte'
  import { twMerge } from 'tailwind-merge'
  import { plug_type, PlugType } from '@sobaka/state/models/links'

  // Workspace props - optional for standalone/storybook use
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  // Simplified: only need plug_id and label
  export let plug_id: string
  export let label: string
  export let disabled = false

  // Derive plug type from plug_id
  $: plugType = plug_type(plug_id)

  let element: HTMLElement

  function handle_click(event: MouseEvent) {
    if (disabled || !workspace) return
    event.stopPropagation()
    workspace?.try_make_link?.(plug_id)
  }

  $: {
    // Register plug position for wire rendering
    // position values must be subscribed to in here to trigger reactivity
    // even if we don't really need the values of x and y
    if (workspace && element && ($position.x !== 0 || $position.y !== 0)) {
      requestAnimationFrame(() => {
        workspace.positions?.registerPlug?.(plug_id, element)
      })
    }
  }

  onDestroy(() => {
    workspace?.positions?.removePlug?.(plug_id)
  })

  const classes = {
    plug: 'cursor-pointer w-3 h-3 pointer-events-auto transition-colors duration-200 rounded-full bg-darker border-2 border-module-accent',
    disabled: 'pointer-events-auto cursor-crosshair',
    hover: 'hover:border-zinc-900 dark:hover:border-zinc-100'
  }
</script>

<Tooltip {label} position={plugType !== PlugType.Output ? 'left' : 'right'}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    role="button"
    data-kind="plug"
    tabindex="0"
    on:click={handle_click}
    aria-label={label}
    class={twMerge(classes.plug, disabled && classes.disabled, classes.hover)}
    bind:this={element}
  ></div>
</Tooltip>
