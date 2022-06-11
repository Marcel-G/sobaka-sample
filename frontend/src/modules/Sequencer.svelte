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
  import { Float, Param, Sequencer } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'sequencer'

  let state = get_sub_state(name, { steps: new Array<number>(8).fill(1) })

  const sequencer = new Sequencer(context, state)

  $: ([s1, s2, s3, s4, s5, s6, s7, s8] = state.steps);

  // Update the sobaka node when the state changes
  $: void sequencer.message({ UpdateStep: [0, s1]})
  $: void sequencer.message({ UpdateStep: [1, s2]})
  $: void sequencer.message({ UpdateStep: [2, s3]})
  $: void sequencer.message({ UpdateStep: [3, s4]})
  $: void sequencer.message({ UpdateStep: [4, s5]})
  $: void sequencer.message({ UpdateStep: [5, s6]})
  $: void sequencer.message({ UpdateStep: [6, s7]})
  $: void sequencer.message({ UpdateStep: [7, s8]})

  
  const knob_range = [0, 8];

  // Update the global state when state changes
  $: update_sub_state(name, { steps: [s1, s2, s3, s4, s5, s6, s7, s8] })

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
      <Knob bind:value={s1} range={knob_range} />
      <Knob bind:value={s2} range={knob_range} />
      <Knob bind:value={s3} range={knob_range} />
      <Knob bind:value={s4} range={knob_range} />
      <Knob bind:value={s5} range={knob_range} />
      <Knob bind:value={s6} range={knob_range} />
      <Knob bind:value={s7} range={knob_range} />
      <Knob bind:value={s8} range={knob_range} />
    </div>
  {/await}
  <div slot="inputs">
    <Plug id={0} label="Input" type={PlugType.Input} for_module={sequencer} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={sequencer} />
  </div>
</Panel>
