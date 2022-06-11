<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
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
  import { Sequencer } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Led from '../components/Led.svelte';

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'sequencer'

  let state = get_sub_state(name, { steps: new Array<number>(8).fill(1) })

  let active_step = 0

  const sequencer = new Sequencer(context, state)

  let { steps } = state

  // Update the sobaka node when the state changes
  $: void sequencer.message({ UpdateStep: [0, steps[0]]})
  $: void sequencer.message({ UpdateStep: [1, steps[1]]})
  $: void sequencer.message({ UpdateStep: [2, steps[2]]})
  $: void sequencer.message({ UpdateStep: [3, steps[3]]})
  $: void sequencer.message({ UpdateStep: [4, steps[4]]})
  $: void sequencer.message({ UpdateStep: [5, steps[5]]})
  $: void sequencer.message({ UpdateStep: [6, steps[6]]})
  $: void sequencer.message({ UpdateStep: [7, steps[7]]})

  // Subscribe to step change
  void sequencer.subscribe('StepChange', step => { active_step = step })
  
  const knob_range = [0, 8];

  // Update the global state when state changes
  $: update_sub_state(name, { steps: steps })

  const loading = sequencer.get_address()

  onDestroy(() => {
    void sequencer.dispose()
  })
</script>

<Panel {name} height={15} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      {#each steps as val, i}
        <Knob bind:value={val} range={knob_range}>
          <div slot="inputs">
            <Led on={active_step === i} />
          </div>
        </Knob>
      {/each}
    </div>
  {/await}
  <div slot="inputs">
    <Plug id={0} label="Input" type={PlugType.Input} for_module={sequencer} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={sequencer} />
  </div>
</Panel>
