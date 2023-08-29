<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = {
    steps: Array<Array<{ value: boolean }>>
  }

  export const initialState: State = {
    steps: new Array(4).fill(undefined).map(() => new Array(8).fill({ value: false }))
  }
</script>

<script lang="ts">
  import type { StepSequencer } from 'sobaka-dsp'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import Button from '../components/Button.svelte'
  import Led from '../components/Led.svelte'
  import { get_context as get_audio_context } from '../audio'
  import { Tuple } from '../@types'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'

  export let state: State
  let name = 'step_sequencer'
  let step_sequencer: StepSequencer
  let node: AudioNode
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { StepSequencer } = await import('sobaka-dsp')
    step_sequencer = await StepSequencer.create($context.audio)
    node = step_sequencer.node()
    loading = false

    // Subscribe to step change
    step_sequencer.subscribe(step => {
      if ('StepChange' in step) {
        active_step = step.StepChange
      }
    })
  })

  let active_step = 0

  // @todo --
  $: steps = state.steps
  $: step_sequencer?.command({
    UpdateSteps: steps.map(step => step.map(({ value }) => value)) as Tuple<
      Tuple<boolean, 8>,
      4
    >
  })

  const update_step = (x: number, y: number, value: boolean) => {
    state.steps[x][y].value = value
  }

  onDestroy(() => {
    step_sequencer?.destroy()
    step_sequencer?.free()
  })
</script>

<Panel {name} height={11} width={17} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <div class="controls">
      {#each steps as step, x}
        <div class="branch">
          {#each step as s, y}
            <Button pressed={s.value} onClick={() => update_step(x, y, !s.value)} />
          {/each}
        </div>
      {/each}
      <div class="branch">
        {#each new Array(8).fill(0) as _, y}
          <Led on={active_step === y} />
        {/each}
      </div>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      label="Gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="Reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      label="Output_1"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="Output_2"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 1 }}
    />
    <Plug
      id={2}
      label="Output_3"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 2 }}
    />
    <Plug
      id={3}
      label="Output_4"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 3 }}
    />
  </div>
</Panel>

<style>
  .branch {
    display: flex;
    justify-content: space-around;
  }
</style>
