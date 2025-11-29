<script context="module" lang="ts">
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
  import { onDestroy, onMount } from 'svelte'
  import Button from '../components/Button.svelte'
  import Led from '../components/Led.svelte'
  import { getGlobalCtx } from '../context/global'
  import { type Tuple } from '../@types'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { PlugType } from '../models/links'

  export let state: State
  export let disabled = false
  let name = 'step_sequencer'
  let step_sequencer: StepSequencer
  let node: AudioNode
  let loading = true

  const context = getGlobalCtx()

  onMount(async () => {
    const { StepSequencer } = await import('sobaka-dsp')
    step_sequencer = await StepSequencer.create(context.audio)
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

<Panel
  {name}
  height={11}
  width={17}
  {disabled}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <div class="flex flex-col justify-between h-full">
      {#each steps as step, x}
        <div class="flex justify-around">
          {#each step as s, y}
            <Button
              class="m-1 px-2 py-2"
              {disabled}
              color="primary"
              size="xs"
              checked={s.value}
              on:click={() => update_step(x, y, !s.value)}
            ></Button>
          {/each}
        </div>
      {/each}
      <div class="flex justify-around">
        {#each new Array(8).fill(0) as _, y}
          <Led on={active_step === y} />
        {/each}
      </div>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="Gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      {disabled}
      label="Reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="Output_1"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      {disabled}
      label="Output_2"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 1 }}
    />
    <Plug
      id={2}
      {disabled}
      label="Output_3"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 2 }}
    />
    <Plug
      id={3}
      {disabled}
      label="Output_4"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 3 }}
    />
  </div>
</Panel>
