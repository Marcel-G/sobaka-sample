<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = Readonly<{
    steps: number[]
  }>

  export const initialState: State = {
    steps: new Array(8).fill(1)
  }
</script>

<script lang="ts">
  import type { Sequencer } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import { SubStore } from '../utils/patches'
  import SequencerRow from './Sequencer.Row.svelte'
  import { get_context as get_audio_context } from '../audio'

  const context = get_audio_context()

  export let state: SubStore<State>
  let name = 'sequencer'
  let sequencer: Sequencer
  let loading = true

  onMount(async () => {
    const { Sequencer } = await import('sobaka-sample-audio-worklet')
    sequencer = new Sequencer($context, $state)
    await sequencer.get_address()
    loading = false

    // Subscribe to step change
    void sequencer.subscribe('StepChange', step => {
      active_step = step
    })
  })

  let active_step = 0

  const steps = $state.steps.map((_, i) => state.select(s => s.steps[i]))

  const cleanup = steps.map((step, i) =>
    step.subscribe(v => {
      if (v) void sequencer?.message({ UpdateStep: [i, v] })
    })
  )

  const knob_range = [0, 8]

  onDestroy(() => {
    cleanup.forEach(unsubscribe => unsubscribe())
    void sequencer?.dispose()
  })
</script>

<Panel {name} height={15} width={8} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="controls">
      {#each steps as val, i}
        <SequencerRow
          index={i}
          active={i === active_step}
          value={val}
          range={knob_range}
        />
      {/each}
    </div>
  {/if}
  <div slot="inputs">
    <Plug id={0} label="gate" type={PlugType.Input} for_module={sequencer} />
    <Plug id={1} label="reset" type={PlugType.Input} for_module={sequencer} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="output" type={PlugType.Output} for_module={sequencer} />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
