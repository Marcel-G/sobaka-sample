<script context="module" lang="ts">
  type State = {
    frequency: number
    q: number
  }

  export const initialState: State = {
    frequency: 0.1,
    q: 0.1
  }
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import {
    create_scale_range,
    create_volt_per_octave_range
  } from '../range/range_creators'
  import { PlugType } from '@sobaka/state/models/links'
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
        <Plug {moduleId} {position} {workspace} id={1} {disabled} label="cutoff_cv" ctx={{ type: PlugType.Param }} />
      </div>
    </Knob>
    <Knob {disabled} bind:value={state.q} range={scalar} label="q">
      <div slot="knob-inputs">
        <Plug {moduleId} {position} {workspace} id={2} {disabled} label="q_cv" ctx={{ type: PlugType.Param }} />
      </div>
    </Knob>
  </div>
  <div slot="inputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="signal" ctx={{ type: PlugType.Input }} />
  </div>
  <div slot="outputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="lowpass" ctx={{ type: PlugType.Output }} />
    <Plug {moduleId} {position} {workspace} id={1} {disabled} label="highpass" ctx={{ type: PlugType.Output }} />
    <Plug {moduleId} {position} {workspace} id={2} {disabled} label="bandpass" ctx={{ type: PlugType.Output }} />
    <Plug {moduleId} {position} {workspace} id={3} {disabled} label="moog" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
