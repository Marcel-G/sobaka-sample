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
    layer,
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

  const timeRange = createScaleRange(0.1, 10)
  const wetRange = createScaleRange(0, 1)
</script>

<Panel
  {name}
  {position}
  {layer}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={8}
  width={8}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  {#snippet children()}
    <div class="controls">
      <Knob {disabled} bind:value={$state.time} range={timeRange} label="time" />
      <Knob {disabled} bind:value={$state.wet} range={wetRange} label="wet">
        <div slot="knob-inputs">
          <Plug 
            ctx={routing.wet} 
            onClick={onPlugClick} 
            bindElement={bindPlugElement}
          />
        </div>
      </Knob>
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
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
