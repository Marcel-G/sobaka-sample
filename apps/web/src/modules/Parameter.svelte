<script context="module" lang="ts">
  type State = { min: number; max: number; value: number }

  export const initialState: State = {
    min: 0,
    max: 10,
    value: 0.5
  }
</script>

<script lang="ts">
  import Knob from '../components/Knob/Knob.svelte'
  import Plug from './shared/Plug.svelte'
  import Panel from './shared/Panel.svelte'
  import { create_scale_range } from '../range/range_creators'
  import { PlugType } from '../models/links'

  export let state: State
  export let disabled = false
  let name = 'parameter'

  $: param_range = create_scale_range(state.min, state.max)
</script>

<Panel
  {name}
  height={6}
  width={5}
  {disabled}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  <span>
    <Knob {disabled} bind:value={state.value} range={param_range} label="value" />
  </span>
  <div slot="outputs">
    <Plug id={0} {disabled} label="output" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
