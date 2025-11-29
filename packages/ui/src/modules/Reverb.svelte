<script context="module" lang="ts">
  type State = {
    wet: number
    length: number
  }

  export const initialState: State = {
    wet: 0.1,
    length: 0.1
  }
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { type Range, RangeType } from '../range/range'
  import { create_scale_range } from '../range/range_creators'
  import { PlugType } from '@sobaka/state/models/links'

  export let state: State
  export let disabled = false
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
    <Plug id={0} {disabled} label="l" ctx={{ type: PlugType.Input }} />
    <Plug id={1} {disabled} label="r" ctx={{ type: PlugType.Input }} />
  </div>

  <div slot="outputs">
    <Plug id={0} {disabled} label="l" ctx={{ type: PlugType.Output }} />
    <Plug id={1} {disabled} label="r" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
