<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { createScaleRange, createVoltPerOctaveRange } from '../range/rangeCreators'
  import { FilterNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface FilterProps extends BaseModuleProps {
    node: FilterNode
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
  }: FilterProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const freqRange = createVoltPerOctaveRange()
  const scalarRange = createScaleRange(0.5, 5)
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
      <Knob {disabled} bind:value={$state.frequency} range={freqRange} label="cutoff">
        <div slot="knob-inputs">
          <Plug 
            ctx={routing.frequency} 
            onClick={onPlugClick} 
            bindElement={bindPlugElement}
          />
        </div>
      </Knob>
      <Knob {disabled} bind:value={$state.q} range={scalarRange} label="q">
        <div slot="knob-inputs">
          <Plug 
            ctx={routing.q} 
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
      ctx={routing.lowpass} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.highpass} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.bandpass} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.moog} 
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
