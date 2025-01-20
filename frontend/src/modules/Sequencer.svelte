<script context="module" lang="ts">
  import type { ModuleTheme } from './ThemeProvider.svelte'
  export const theme: Partial<ModuleTheme> = {
    primary: 'var(--cyan)'
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
  import { onDestroy, onMount } from 'svelte'
  import { getGlobalCtx } from '../context/global'
  import Knob from '../components/Knob/Knob.svelte'
  import Led from '../components/Led.svelte'
  import { type Tuple } from '../@types'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { type Range, RangeType } from '../range/range'
  import { PlugType } from '../models/workspace'

  const context = getGlobalCtx()

  export let state: State
  export let disabled = false
  let name = 'sequencer'
  let sequencer: Sequencer
  let node: AudioNode
  let loading = true

  onMount(async () => {
    const { Sequencer } = await import('sobaka-dsp')
    sequencer = await Sequencer.create(context.audio)
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

  const knob_range: Range = {
    type: RangeType.Continuous,
    start: 0,
    end: 8
  }

  onDestroy(() => {
    sequencer?.destroy()
    sequencer?.free()
  })
</script>

<Panel {name} height={8} width={26} {disabled} {theme}>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <div class="controls">
      {#each state.steps as step, i}
        <Knob
          {disabled}
          bind:value={step.value}
          range={knob_range}
          label={`step_${i + 1}`}
        >
          <div slot="knob-inputs">
            <Led on={i === active_step} />
          </div>
        </Knob>
      {/each}
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      {disabled}
      label="reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto auto auto auto auto auto auto;
    pointer-events: none;
  }
</style>
