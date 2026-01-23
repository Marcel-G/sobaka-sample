<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Knob from '../../components/Knob/Knob.svelte'
  import Switch from '../../components/Switch.svelte'
  import { RangeType, Scale, type ContinuousRange, type ChoiceRange } from '../../range/range'
  import { LfoNode, LfoShape } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../../types/props'
  import { intoReadable } from '@sobaka/state/util/store'
  import Sine from './Sine.svelte'
  import Triangle from './Triangle.svelte'
  import Square from './Square.svelte'
  import Saw from './Saw.svelte'
  import ReverseSaw from './ReverseSaw.svelte'

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

  const shapeNames = ['Sine', 'Triangle', 'Square', 'Saw', 'Rev Saw']
  const shapeRange: ChoiceRange = {
    type: RangeType.Choice,
    choices: shapeNames.map((shape, i) => ({ label: shape, value: i }))
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
  height={8}
  width={8}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#snippet children()}
    <div class="controls">
      <Switch {disabled} bind:value={$state.shape} range={shapeRange} label="shape">
        <div class="wave" slot="value">
          {#if $state.shape === LfoShape.Sine}
            <Sine />
          {:else if $state.shape === LfoShape.Triangle}
            <Triangle />
          {:else if $state.shape === LfoShape.Square}
            <Square />
          {:else if $state.shape === LfoShape.Saw}
            <Saw />
          {:else if $state.shape === LfoShape.ReverseSaw}
            <ReverseSaw />
          {/if}
        </div>
      </Switch>
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
  }

  .wave {
    height: 0.75rem;
    display: flex;
    justify-content: center;
    fill: var(--color-light);
    stroke: var(--color-light);
    margin-bottom: 0.25rem;
  }
</style>
