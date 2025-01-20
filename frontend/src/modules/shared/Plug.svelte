<script lang="ts">
  import { onDestroy } from 'svelte'
  import { type NodeContext, type ParamContext } from '../../context/plugs'
  import Tooltip from '../../components/Tooltip.svelte'
  import { get_workspace } from '../../context/workspace'
  import { get_module_context } from '../context'
  import { twMerge } from 'tailwind-merge'
  import { createPlugId, PlugType } from '../../models/workspace'

  const { workspace } = get_workspace()
  const { id: module_id } = get_module_context()
  const position = workspace.module_position(module_id)

  export let ctx: ParamContext | NodeContext
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
    if (disabled) return
    event.stopPropagation()
    workspace.try_make_link(plug_id)
  }

  // TODO: do something with ctx, so that Links can be connected...
  $: {
    // TODO: only register plugs initially, and on move.

    // position values must be subscribed to in here to trigger reactivity
    // even if we don't really need the values of x and y
    if (element && ($position.x !== 0 || $position.y !== 0)) {
      requestAnimationFrame(() => {
        workspace.positions.registerPlug(plug_id, element)
      })
    }
  }

  $: {
    workspace.register_plug(plug_id, ctx)
  }

  onDestroy(() => {
    workspace.remove_plug(plug_id)
    workspace.positions.removePlug(plug_id)
  })

  const classes = {
    plug: 'cursor-pointer w-3 h-3 pointer-events-auto transition-colors duration-200 rounded-full bg-white border-2 border-zinc-200 dark:border-zinc-900',
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
