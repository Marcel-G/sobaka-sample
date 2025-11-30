<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Knob from '../../components/Knob/Knob.svelte'
  import Layout from '../../components/Layout.svelte'
  import Switch from '../../components/Switch.svelte'
  import { createVoltPerOctaveRange } from '../../range/rangeCreators'
  import { RangeType, type ChoiceRange } from '../../range/range'
  import { OscillatorNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../../types/props'
  import { intoReadable } from '@sobaka/state/util/store'
  import Sine from './Sine.svelte'
  import Saw from './Saw.svelte'
  import Square from './Square.svelte'
  import Triangle from './Triangle.svelte'

  interface OscillatorProps extends BaseModuleProps {
    node: OscillatorNode
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
  }: OscillatorProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const pitch = createVoltPerOctaveRange()
  
  const shapeNames = ['Sine', 'Square', 'Triangle', 'Saw']
  const shapeRange: ChoiceRange = {
    type: RangeType.Choice,
    choices: shapeNames.map((shape, i) => ({ label: shape, value: i }))
  }

  $effect(() => {
    node.setShape($state.shape)
  })
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
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  {#snippet children()}
    <div class="controls">
      <Switch {disabled} bind:value={$state.shape} range={shapeRange} label="shape">
        <div class="wave" slot="value">
          {#if shapeNames[$state.shape] === 'Square'}
            <Square />
          {:else if shapeNames[$state.shape] === 'Sine'}
            <Sine />
          {:else if shapeNames[$state.shape] === 'Saw'}
            <Saw />
          {:else if shapeNames[$state.shape] === 'Triangle'}
            <Triangle />
          {/if}
        </div>
      </Switch>
      <Knob {disabled} bind:value={$state.pitch} range={pitch} label="pitch">
        <div slot="knob-inputs">
          <Plug 
            ctx={routing.pitch} 
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
