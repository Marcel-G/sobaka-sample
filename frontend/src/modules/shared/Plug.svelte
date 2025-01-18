<script lang="ts">
  import { onDestroy } from 'svelte'
  import { writable, type Writable } from 'svelte/store'
  import { type NodeContext, type ParamContext, PlugType } from '../../context/plugs'
  import Tooltip from '../../components/Tooltip.svelte'
  import { get_workspace } from '../../context/workspace'
  import { get_module_context } from '../context'
  import { twMerge } from 'tailwind-merge'

  const { workspace, plugs } = get_workspace()
  const { id: module_id } = get_module_context()
  const position = workspace.module_position(module_id)

  export let ctx: ParamContext | NodeContext
  export let id: number
  export let label: string
  export let disabled = false

  let plug_id: string

  const node: Writable<Element | null> = writable(null)

  // @todo - make this type-safe
  if ([PlugType.Input, PlugType.Output].includes(ctx.type) && id === undefined) {
    throw new Error('Input & Output plug types must have id')
  }

  $: if (
    // @todo -- annoying null check
    (ctx.type === PlugType.Param && ctx.param) ||
    (ctx.type !== PlugType.Param && ctx.module)
  ) {
    // Register once module is defined
    plug_id = plugs.register(module_id, { index: id, node, ctx })
  }

  function handle_click() {
    if (disabled) return
    plugs.make(plug_id)
  }

  $: {
    // position values must be subscribed to in here to trigger reactivity
    // even if we don't really need the values of x and y
    if ($position.x !== 0 || $position.y !== 0) {
      requestAnimationFrame(() => {
        // Trigger a state update so that dependencies re-calculate the new position
        node.update(plug_element => plug_element)
      })
    }
  }

  onDestroy(() => {
    plugs.remove(plug_id)
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
    tabindex="0"
    aria-label={label}
    class={twMerge(classes.plug, disabled && classes.disabled, classes.hover)}
    on:click={() => handle_click()}
    bind:this={$node}
  ></div>
</Tooltip>
