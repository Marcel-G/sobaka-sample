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
  import type { StepSequencer } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import Button from '../components/Button.svelte'
  import Led from '../components/Led.svelte'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'

  export let state: SubStore<State>
  let name = 'step_sequencer'
  let step_sequencer: StepSequencer
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { StepSequencer } = await import('sobaka-sample-audio-worklet')
    step_sequencer = new StepSequencer($context, $state)
    await step_sequencer.get_address()
    loading = false

    // Subscribe to step change
    void step_sequencer.subscribe('StepChange', step => {
      active_step = step
    })
  })

  let active_step = 0

  const cleanup = $state.steps.flatMap((step_x, x) =>
    step_x.map((_, y) =>
      state
        .select(s => s.steps[x][y])
        .subscribe(v => {
          if (v) void step_sequencer?.message({ UpdateStep: [[x, y], v] })
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
    void step_sequencer.dispose()
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

<style>
  .branch {
    display: flex;
    justify-content: space-around;
  }
</style>
