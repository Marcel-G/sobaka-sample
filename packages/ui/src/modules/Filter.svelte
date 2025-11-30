<script context="module" lang="ts">
  import { routing } from './routing'
  
  type State = {
    frequency: number
    q: number
  }

  export const initialState: State = {
    frequency: 0.1,
    q: 0.1
  }
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    inputs: [[0, 'Signal']],
    params: [
      [1, 'Cutoff CV'],
      [2, 'Q CV']
    ],
    outputs: [
      [0, 'Lowpass'],
      [1, 'Highpass'],
      [2, 'Bandpass'],
      [3, 'Moog']
    ]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import {
    create_scale_range,
    create_volt_per_octave_range
  } from '../range/range_creators'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'filter'

  const freq_range = create_volt_per_octave_range()
  const scalar = create_scale_range()
</script>

<Panel
  {name}
  {disabled}
  {moduleId}
  {position}
  {workspace}
  height={8}
  width={8}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  <div class="controls">
    <Knob {disabled} bind:value={state.frequency} range={freq_range} label="cutoff">
      <div slot="knob-inputs">
        <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.params?.slice(0, 1)} type="params" />
      </div>
    </Knob>
    <Knob {disabled} bind:value={state.q} range={scalar} label="q">
      <div slot="knob-inputs">
        <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.params?.slice(1, 2)} type="params" />
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
    pointer-events: none;
  }
</style>
