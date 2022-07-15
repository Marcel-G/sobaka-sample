<style>
  .branch {
    display: flex;
    justify-content: space-around;
  }
</style>

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }
</script>

<script lang="ts">
  import { StepSequencer } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import { onDestroy } from 'svelte'
  import Button from '../components/Button.svelte'
  import Led from '../components/Led.svelte'
  import { fill } from 'lodash'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'step_sequencer'

  let state = get_sub_state(name, {
    steps: new Array<boolean[]>(4).fill(new Array<boolean>(8).fill(false))
  })

  let active_step = 0

  const step_sequencer = new StepSequencer(context, state)

  let { steps } = state

  const update_step = (x: number, y: number, value: boolean) => {
    steps[x][y] = value
    step_sequencer.message({ UpdateStep: [[x, y], value] })
  }

  // Subscribe to step change
  void step_sequencer.subscribe('StepChange', step => {
    active_step = step
  })

  // Update the global state when state changes
  $: update_sub_state(name, { steps: steps })

  const loading = step_sequencer.get_address()

  onDestroy(() => {
    void step_sequencer.dispose()
  })
</script>

<Panel {name} height={11} width={17} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      {#each steps as step, x}
        <div class="branch">
          {#each step as s, y}
            <Button pressed={s} onClick={() => update_step(x, y, !s)} />
          {/each}
        </div>
      {/each}
      <div class="branch">
        {#each new Array(8).fill(0) as _, y}
          <Led on={active_step === y} />
        {/each}
      </div>
    </div>
  {/await}
  <div slot="inputs">
    <Plug id={0} label="Gate" type={PlugType.Input} for_module={step_sequencer} />
    <Plug id={1} label="Reset" type={PlugType.Input} for_module={step_sequencer} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output_1" type={PlugType.Output} for_module={step_sequencer} />
    <Plug id={1} label="Output_2" type={PlugType.Output} for_module={step_sequencer} />
    <Plug id={2} label="Output_3" type={PlugType.Output} for_module={step_sequencer} />
    <Plug id={3} label="Output_4" type={PlugType.Output} for_module={step_sequencer} />
  </div>
</Panel>
