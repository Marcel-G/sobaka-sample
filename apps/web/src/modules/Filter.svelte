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
  import { PlugType } from '../models/links'

  export let state: State
  export let disabled = false
  let name = 'filter'

  const freq_range = create_volt_per_octave_range()
  const scalar = create_scale_range()
</script>

<Panel
  {name}
  {disabled}
  height={8}
  width={8}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  <div class="controls">
    <Knob {disabled} bind:value={state.frequency} range={freq_range} label="cutoff">
      <div slot="knob-inputs">
        <Plug id={1} {disabled} label="cutoff_cv" ctx={{ type: PlugType.Param }} />
      </div>
    </Knob>
    <Knob {disabled} bind:value={state.q} range={scalar} label="q">
      <div slot="knob-inputs">
        <Plug id={2} {disabled} label="q_cv" ctx={{ type: PlugType.Param }} />
      </div>
    </Knob>
  </div>
  <div slot="inputs">
    <Plug id={0} {disabled} label="signal" ctx={{ type: PlugType.Input }} />
  </div>
  <div slot="outputs">
    <Plug id={0} {disabled} label="lowpass" ctx={{ type: PlugType.Output }} />
    <Plug id={1} {disabled} label="highpass" ctx={{ type: PlugType.Output }} />
    <Plug id={2} {disabled} label="bandpass" ctx={{ type: PlugType.Output }} />
    <Plug id={3} {disabled} label="moog" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
