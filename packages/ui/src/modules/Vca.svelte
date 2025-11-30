<script context="module" lang="ts">
  import { routing } from './routing'
  
  type State = { value: number }

  export const initialState: State = {
    value: 0.5
  }
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    inputs: [[0, 'Signal']],
    params: [[1, 'CV']],
    outputs: [[0, 'Out']]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { create_bipolar_scale_range } from '../range/range_creators'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'vca'

  const attenuverter = create_bipolar_scale_range()
</script>

<Panel
  {name}
  {moduleId}
  {position}
  {workspace}
  height={6}
  width={5}
  {disabled}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  <span>
    <Knob {disabled} bind:value={state.value} range={attenuverter} label="attenuverter" />
  </span>

  <div slot="inputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.inputs} type="inputs" />
  </div>

  <div slot="params">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.params} type="params" />
  </div>

  <div slot="outputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.outputs} type="outputs" />
  </div>
</Panel>
