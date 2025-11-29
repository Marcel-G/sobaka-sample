<script context="module" lang="ts">
  type State = { time: number }

  export const initialState: State = { time: 2 }
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { create_time_range } from '../range/range_creators'
  import { PlugType } from '@sobaka/state/models/links'

  export let state: State
  export let disabled = false
  let name = 'delay'

  const delay_range = create_time_range(0, 10)
</script>

<Panel
  {name}
  {disabled}
  height={8}
  width={5}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  <div class="controls">
    <Knob {disabled} bind:value={state.time} range={delay_range} label="seconds">
      <div slot="knob-inputs">
        <Plug id={0} {disabled} label="seconds_cv" ctx={{ type: PlugType.Param }} />
      </div>
    </Knob>
  </div>
  <div slot="inputs">
    <Plug id={0} {disabled} label="signal" ctx={{ type: PlugType.Input }} />
    <Plug id={1} {disabled} label="reset" ctx={{ type: PlugType.Input }} />
  </div>
  <div slot="outputs">
    <Plug id={0} {disabled} label="output" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
