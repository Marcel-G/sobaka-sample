<script context="module" lang="ts">
  type State = {
    attack: number
    decay: number
    sustain: number
    release: number
  }

  export const initialState: State = {
    attack: 0.1,
    decay: 0.1,
    sustain: 0.1,
    release: 0.1
  }
</script>

<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Graph from './Graph.svelte'
  import Input from '../../components/Input.svelte'
  import { create_scale_range, create_time_range } from '../../range/range_creators'
  import Tooltip from '../../components/Tooltip.svelte'
  import { PlugType } from '@sobaka/state/models/links'

  export let state: State
  export let disabled = false
  let name = 'envelope'

  let trigger_on: () => void
  let trigger_off: () => void

  const duration = create_time_range()
  const scalar = create_scale_range()

  // TODO: Subscribe to envelope events from DSP layer for visual feedback
  // This would require adding an event system to the DSP manager
</script>

<Panel
  {name}
  height={10}
  width={16}
  {disabled}
  --color-module-accent="var(--color-yellow)"
  --color-module-background="var(--color-yellow-dark)"
>
  <div class="controls">
    <Graph
      bind:trigger_on
      bind:trigger_off
      attack={state.attack}
      decay={state.decay}
      sustain={state.sustain}
      release={state.release}
    />
    <div class="values">
      <div class="input">
        <Tooltip label="attack" position="left">
          <Input {disabled} bind:value={state.attack} range={duration} />
        </Tooltip>
      </div>
      <div class="input">
        <Tooltip label="decay">
          <Input {disabled} bind:value={state.decay} range={duration} />
        </Tooltip>
      </div>
      <div class="input">
        <Tooltip label="sustain">
          <Input {disabled} bind:value={state.sustain} range={scalar} />
        </Tooltip>
      </div>
      <div class="input">
        <Tooltip label="release">
          <Input {disabled} bind:value={state.release} range={duration} />
        </Tooltip>
      </div>
    </div>
  </div>
  <div slot="inputs">
    <Plug id={0} {disabled} label="gate" ctx={{ type: PlugType.Input }} />
  </div>
  <div slot="outputs">
    <Plug id={0} {disabled} label="envelope" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .values {
    display: flex;
    flex-direction: row;
  }

  .input {
    display: inline-flex;
    font-size: 0.75rem;
    font-family: monospace;
  }
</style>
