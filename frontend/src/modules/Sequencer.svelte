<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = {
    steps: { value: number }[]
  }

  export const initialState: State = {
    steps: new Array(8).fill({ value: 1 })
  }
</script>

<script lang="ts">
  import type { Sequencer } from 'sobaka-dsp'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import { get_context as get_audio_context } from '../audio'
  import Knob from '../components/Knob.svelte'
  import Led from '../components/Led.svelte'
  import { Tuple } from '../@types'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'

  const context = get_audio_context()

  export let state: State
  let name = 'sequencer'
  let sequencer: Sequencer
  let node: AudioNode
  let loading = true

  onMount(async () => {
    const { Sequencer } = await import('sobaka-dsp')
    sequencer = await Sequencer.create($context)
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

  $: steps = state.steps
  // @todo -- send all steps
  $: sequencer?.command({
    UpdateSteps: steps.map(({ value }) => value) as Tuple<number, 8>
  })

  const knob_range = [0, 8]

  onDestroy(() => {
    sequencer?.destroy()
    sequencer?.free()
  })
</script>

<Panel {name} height={15} width={8} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <div class="controls">
      {#each state.steps as step, i}
        <Knob bind:value={step.value} range={knob_range} label={`step_${i + 1}`}>
          <div slot="inputs">
            <Led on={i === active_step} />
          </div>
        </Knob>
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
