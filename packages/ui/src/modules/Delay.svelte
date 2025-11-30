<script context="module" lang="ts">
  import { routing } from './routing'
  
  type State = { time: number }

  export const initialState: State = { time: 2 }
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    params: [[0, 'Time CV']],
    inputs: [
      [0, 'Signal'],
      [1, 'Reset']
    ],
    outputs: [[0, 'Out']]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { create_time_range } from '../range/range_creators'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'delay'

  const delay_range = create_time_range(0, 10)
</script>

<Panel
  {name}
  {disabled}
  {moduleId}
  {position}
  {workspace}
  height={8}
  width={5}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  <div class="controls">
    <Knob {disabled} bind:value={state.time} range={delay_range} label="seconds">
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
