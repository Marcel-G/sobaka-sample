<script context="module" lang="ts">
  import { routing } from '../routing'
  
  type State = {
    pitch: number
    shape: number
  }

  export const initialState: State = {
    pitch: 0,
    shape: 0
  }
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    params: [[0, 'Pitch CV']],
    inputs: [[1, 'Reset']],
    outputs: [[0, 'Out']]
  })
</script>

<script lang="ts">
  import type { OscillatorShape } from '@sobaka/dsp'
  import Panel from '../shared/Panel.svelte'
  import PlugList from '../shared/PlugList.svelte'
  import Knob from '../../components/Knob/Knob.svelte'
  import Layout from '../../components/Layout.svelte'
  import { create_volt_per_octave_range } from '../../range/range_creators'
  import { type ChoiceRange, RangeType } from '../../range/range'
  import Switch from '../../components/Switch.svelte'
  import Sine from './Sine.svelte'
  import Saw from './Saw.svelte'
  import Square from './Square.svelte'
  import Triangle from './Triangle.svelte'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'oscillator'

  const shapes: OscillatorShape[] = ['Sine', 'Square', 'Triangle', 'Saw']

  const freq_range = create_volt_per_octave_range()

  const shape_range: ChoiceRange = {
    type: RangeType.Choice,
    choices: shapes.map((shape, i) => ({ label: shape, value: i }))
  }
</script>

<Panel
  {name}
  {moduleId}
  {position}
  {workspace}
  height={8}
  width={8}
  {disabled}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  <div class="controls">
    <Switch {disabled} bind:value={state.shape} range={shape_range} label="shape">
      <div class="wave" slot="value">
        {#if shapes[state.shape] === 'Square'}
          <Square />
        {:else if shapes[state.shape] === 'Sine'}
          <Sine />
        {:else if shapes[state.shape] === 'Saw'}
          <Saw />
        {:else if shapes[state.shape] === 'Triangle'}
          <Triangle />
        {/if}
      </div>
    </Switch>
    <Knob {disabled} bind:value={state.pitch} range={freq_range} label="pitch">
      <div slot="knob-inputs">
        <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.params} type="params" />
      </div>
    </Knob>
  </div>
  <div slot="inputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.inputs} type="inputs" />
  </div>
  <div slot="outputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.outputs} type="outputs" />
  </div>
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
