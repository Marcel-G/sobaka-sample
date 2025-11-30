<script context="module" lang="ts">
  import { routing } from './routing'
  
  type State = { bpm: number }

  export const initialState: State = { bpm: 120 }
  
  // Routing definition - single source of truth for plugs
  // This mirrors the DSP layer's getRouting() but lives with the UI component
  export const moduleRouting = routing({
    params: [[0, 'BPM CV']],
    outputs: [
      [0, '1/1'],
      [1, '1/2'],
      [2, '1/4'],
      [3, '1/8'],
      [4, '1/16']
    ]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import { create_bpm_range } from '../range/range_creators'
  import { writable, type Readable } from 'svelte/store'
  import { type ClockState } from '@sobaka/dsp'

  export let state: ClockState
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'clock'

  // @todo -- make this work with volt per octave
  const bpm = create_bpm_range()
</script>

<Panel
  {name}
  {disabled}
  {moduleId}
  {position}
  {workspace}
  height={8}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  <Layout type="center">
    <Knob {disabled} bind:value={state.bpm} range={bpm} label="bpm">
      <div slot="knob-inputs">
        <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.params} type="params" />
      </div>
    </Knob>
  </Layout>

  <div slot="outputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.outputs} type="outputs" />
  </div>
</Panel>
