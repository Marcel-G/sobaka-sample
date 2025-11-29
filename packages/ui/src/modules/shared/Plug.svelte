<script lang="ts">
  import { onDestroy, getContext, hasContext } from 'svelte'
  import { writable } from 'svelte/store'
  import Tooltip from '../../components/Tooltip.svelte'
  import { twMerge } from 'tailwind-merge'
  import { createPlugId, PlugType } from '@sobaka/state/models/links'

  // Get context if available (in app), otherwise use defaults (in Storybook)
  const workspace: any = hasContext('workspace') ? (getContext('workspace') as any)?.workspace : null
  const module_id: string = hasContext('module') ? (getContext('module') as any)?.id : 'storybook-module'
  const position = workspace?.module_position?.(module_id) ?? writable({ x: 0, y: 0 })

  // ctx is now optional - if not provided, only type is needed for plug ID generation
  // The actual audio node context is managed by DSP layer
  export let ctx: any | { type: PlugType } = { type: PlugType.Output }
  export let id: number
  export let label: string
  export let disabled = false

  const plug_id = createPlugId(module_id, ctx.type, id)

  let element: HTMLElement

  // @todo - make this type-safe
  if ([PlugType.Input, PlugType.Output].includes(ctx.type) && id === undefined) {
    throw new Error('Input & Output plug types must have id')
  }

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

  $: {
    // Register plug context with workspace (now handled by DSP layer, but kept for backwards compat)
    if (workspace && ('param' in ctx || 'module' in ctx)) {
      workspace.register_plug(plug_id, ctx)
    }
  }

  onDestroy(() => {
    workspace?.remove_plug?.(plug_id)
    workspace?.positions?.removePlug?.(plug_id)
  })

  const classes = {
    plug: 'cursor-pointer w-3 h-3 pointer-events-auto transition-colors duration-200 rounded-full bg-darker border-2 border-module-accent',
    disabled: 'pointer-events-auto cursor-crosshair',
    hover: 'hover:border-zinc-900 dark:hover:border-zinc-100'
  }
</script>

<Tooltip {label} position={ctx.type !== PlugType.Output ? 'left' : 'right'}>
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
