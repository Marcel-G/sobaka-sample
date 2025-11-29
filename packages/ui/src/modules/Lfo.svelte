<script context="module" lang="ts">
  type State = { bpm: number }

  export const initialState: State = { bpm: 120 }
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { create_bpm_range } from '../range/range_creators'
  import { PlugType } from '../models/links'

  export let state: State
  export let disabled = false
  let name = 'lfo'

  // @todo -- make this work with volt per octave
  const lfo_range = create_bpm_range(0, 600)
</script>

<Panel
  {name}
  {disabled}
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
    <Plug id={0} {disabled} label="signal" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
