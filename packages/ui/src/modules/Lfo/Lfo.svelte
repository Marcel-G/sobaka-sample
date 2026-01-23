<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Knob from '../../components/Knob/Knob.svelte'
  import { RangeType, Scale, type ContinuousRange } from '../../range/range'
  import { LfoNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface LfoProps extends BaseModuleProps {
    node: LfoNode
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
  }: LfoProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  // LFO rate range: 0.01 Hz to 30 Hz with logarithmic scaling
  const rateRange: ContinuousRange = {
    type: RangeType.Continuous,
    start: 0.01,
    end: 30,
    scale: { type: Scale.Logarithmic },
    valueToString: (v) => {
      if (v < 1) {
        return `${(v * 1000).toFixed(0)} mHz`
      }
      return `${v.toFixed(2)} Hz`
    },
    stringToValue: (v, unit) => {
      if (unit === 'mhz') {
        return v / 1000
      }
      return v
    }
  }
</script>

<Panel
  {name}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={6}
  width={6}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#snippet children()}
    <div class="controls">
      <Knob {disabled} bind:value={$state.rate} range={rateRange} label="rate">
        <div slot="knob-inputs">
          <Plug 
            ctx={routing.rate} 
            onClick={onPlugClick} 
            bindElement={bindPlugElement}
          />
        </div>
      </Knob>
    </div>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.reset} 
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
    display: flex;
    justify-content: center;
  }
</style>
