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
  import type { Sequencer } from 'sobaka-dsp'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import SequencerRow from './Sequencer.Row.svelte'
  import { get_context as get_audio_context } from '../audio'

  const context = get_audio_context()

  export let state: State
  let name = 'sequencer'
  let sequencer: Sequencer
  let node: AudioNode
  let loading = true

  onMount(async () => {
    const { Sequencer } = await import('sobaka-dsp')
    sequencer = await Sequencer.create($context, $state as any)
    node = sequencer.node()
    loading = false

    // Subscribe to step change
    sequencer.subscribe(step => {
      if ('StepChange' in step) {
        active_step = step.StepChange
      }
    })
  })

  let active_step = 0

  const steps = $state.steps.map((_, i) => state.select(s => s.steps[i]))

  const cleanup = steps.map((step, i) =>
    step.subscribe(v => {
      if (v !== undefined) {
        // state can be undefined just before removal
        sequencer?.command({ UpdateStep: [i, v] })
      }
    })
  )

  const knob_range = [0, 8]

  onDestroy(() => {
    cleanup.forEach(unsubscribe => unsubscribe())
    sequencer?.destroy()
    sequencer?.free()
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
    <Plug
      id={0}
      label="gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      label="output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
