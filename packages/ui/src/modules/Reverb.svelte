<script context="module" lang="ts">
  import { routing } from './routing'
  
  type State = {
    wet: number
    length: number
  }

  export const initialState: State = {
    wet: 0.1,
    length: 0.1
  }
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    inputs: [
      [0, 'L'],
      [1, 'R']
    ],
    outputs: [
      [0, 'L'],
      [1, 'R']
    ]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { type Range, RangeType } from '../range/range'
  import { create_scale_range } from '../range/range_creators'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'reverb'

  const scalar = create_scale_range()

  const delay_length_range: Range = {
    type: RangeType.Continuous,
    start: 0,
    end: 10
  }
</script>

<Panel
  {name}
  {moduleId}
  {position}
  {workspace}
  height={6}
  width={8}
  {disabled}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  <div class="controls">
    <Knob {disabled} bind:value={state.wet} range={scalar} label="wet" />
    <Knob {disabled} bind:value={state.length} range={delay_length_range} label="length" />
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
