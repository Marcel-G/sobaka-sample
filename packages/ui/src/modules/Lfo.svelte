<script context="module" lang="ts">
  import { routing } from './routing'
  
  type State = { bpm: number }

  export const initialState: State = { bpm: 120 }
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    outputs: [[0, 'Out']]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { create_bpm_range } from '../range/range_creators'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'lfo'

  // @todo -- make this work with volt per octave
  const lfo_range = create_bpm_range(0, 600)
</script>

<Panel
  {name}
  {disabled}
  {moduleId}
  {position}
  {workspace}
  height={6}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  <Knob {disabled} bind:value={state.bpm} range={lfo_range} label="bpm">
    <!-- <div slot="inputs">
      <Plug id={1} label="bpm_cv" ctx={{ type: PlugType.Param }} />
    </div> -->
  </Knob>
  <!-- @todo can't do reset with OscillatorNode?
  <div slot="inputs">
    <Plug id={0} label="reset" ctx={{ type: PlugType.Input }} />
  </div> -->

  <div slot="outputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.outputs} type="outputs" />
  </div>
</Panel>
