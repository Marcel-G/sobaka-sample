<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = Readonly<{
    steps: Array<Array<boolean>>
  }>

  export const initialState: State = {
    steps: new Array(4).fill(undefined).map(() => new Array(8).fill(false))
  }
</script>

<script lang="ts">
  import type { StepSequencerNode } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import Button from '../components/Button.svelte'
  import Led from '../components/Led.svelte'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'
  import Output from './Output.svelte'

  export let state: SubStore<State>
  let name = 'step_sequencer'
  let step_sequencer: StepSequencerNode
  let node: AudioNode
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { StepSequencerNode } = await import('sobaka-sample-audio-worklet')
    step_sequencer = await StepSequencerNode.install($context)
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

  const cleanup = $state.steps.flatMap((step_x, x) =>
    step_x.map((_, y) =>
      state
        .select(s => s.steps[x][y])
        .subscribe(v => {
          if (v) step_sequencer?.command({ UpdateStep: [[x, y], v] })
        })
    )
  )

  const update_step = (x: number, y: number, value: boolean) => {
    state.update(s => {
      s.steps[x][y] = value
      return s
    })
  }

  const steps = state.select(s => s.steps)

  onDestroy(() => {
    cleanup.forEach(unsubscribe => unsubscribe())
    step_sequencer?.destroy()
    step_sequencer?.free()
  })
</script>

<Panel {name} height={11} width={17} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="controls">
      {#each $steps as step, x}
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