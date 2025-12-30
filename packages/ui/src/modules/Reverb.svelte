<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { createScaleRange } from '../range/rangeCreators'
  import { ReverbNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface ReverbProps extends BaseModuleProps {
    node: ReverbNode
  }

  let {
    node,
    disabled = false,
    position,
    onClose,
    onClone,
    onDrag,
    onPlugClick,
    bindPlugElement,
    bindElement
  }: ReverbProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const roomSizeRange = createScaleRange(0.1, 50)
  const dampingRange = createScaleRange(0.1, 10)
  const wetRange = createScaleRange(0, 1)
</script>

<Panel
  {name}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={8}
  width={10}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  {#snippet children()}
    <div class="controls">
      <Knob {disabled} bind:value={$state.roomSize} range={roomSizeRange} label="room size" />
      <Knob {disabled} bind:value={$state.damping} range={dampingRange} label="damping" />
      <Knob {disabled} bind:value={$state.wet} range={wetRange} label="wet" />
    </div>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.input} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}

  {#snippet outputs()}
    <Plug 
      ctx={routing.output} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto auto;
    pointer-events: none;
  }
</style>
