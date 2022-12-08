<script lang="ts">
  import { onDestroy } from 'svelte'
  import { writable, Writable } from 'svelte/store'
  import context, { NodeContext, ParamContext, PlugType } from '../../workspace/plugs'
  import Tooltip from '../../components/Tooltip.svelte'
  import { get_workspace } from '../../workspace/context'
  import { get_module_context } from '../context'

  const space = get_workspace()
  const { id: module_id } = get_module_context()
  const module = space.get_module_substore(module_id)
  const position = module.select(state => state.position)

  export let ctx: ParamContext | NodeContext
  export let id: number
  export let label: string

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
    plug_id = context.register(module_id, { index: id, node, ctx })
  }

  function handle_click() {
    context.make(space, plug_id)
  }

  function on_move() {
    requestAnimationFrame(() => {
      // Trigger a state update so that dependencies re-calculate the new position
      node.update(plug_element => plug_element)
    })
  }

  const cleanup = position.subscribe(on_move)

  onDestroy(() => {
    cleanup()
    context.remove(space, plug_id)
  })
</script>

<Tooltip {label} position={ctx.type !== PlugType.Output ? 'left' : 'right'}>
  <div
    role="button"
    aria-label={label}
    class="plug"
    on:click={() => handle_click()}
    bind:this={$node}
  />
</Tooltip>

<style>
  .plug {
    cursor: pointer;
    width: 0.8rem;
    height: 0.8rem;
    background-color: var(--background);
    border: 2px solid var(--module-highlight);

    transition: border-color 0.25s;

    border-radius: 50%;
  }

  .plug:hover {
    border-color: var(--foreground);
  }
</style>
