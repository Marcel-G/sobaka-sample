<script context="module" lang="ts">
  type State = {
    frequency: number
    q: number
  }

  export const initialState: State = {
    frequency: 0.1,
    q: 0.1
  }
</script>

<script lang="ts">
  import { Filter } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import {
    create_scale_range,
    create_volt_per_octave_range
  } from '../range/range_creators'
  import { getGlobalCtx } from '../context/global'
  import { PlugType } from '../models/workspace'

  export let state: State
  export let disabled = false
  let name = 'filter'
  let filter: Filter
  let node: AudioNode
  let frequency_param: AudioParam
  let q_param: AudioParam
  let loading = true

  const context = getGlobalCtx()

  onMount(async () => {
    const { Filter } = await import('sobaka-dsp')
    filter = await Filter.create(context.audio)
    node = filter.node()
    frequency_param = filter.get_param('Frequency')
    q_param = filter.get_param('Q')
    loading = false
  })

  // Update the sobaka node when the state changes
  $: frequency = state.frequency
  $: frequency_param?.setValueAtTime(frequency, context.audio.currentTime)
  $: q = state.q
  $: q_param?.setValueAtTime(q, context.audio.currentTime)

  const freq_range = create_volt_per_octave_range()
  const scalar = create_scale_range()

  onDestroy(() => {
    filter?.destroy()
    filter?.free()
  })
</script>

<Panel
  {name}
  {disabled}
  height={8}
  width={8}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <div class="controls">
      <Knob {disabled} bind:value={state.frequency} range={freq_range} label="cutoff">
        <div slot="knob-inputs">
          <Plug
            id={1}
            {disabled}
            label="cutoff_cv"
            ctx={{ type: PlugType.Param, param: frequency_param }}
          />
        </div>
      </Knob>
      <Knob {disabled} bind:value={state.q} range={scalar} label="q">
        <div slot="knob-inputs">
          <Plug
            id={2}
            {disabled}
            label="q_cv"
            ctx={{ type: PlugType.Param, param: q_param }}
          />
        </div>
      </Knob>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="lowpass"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      {disabled}
      label="highpass"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 1 }}
    />
    <Plug
      id={2}
      {disabled}
      label="bandpass"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 2 }}
    />
    <Plug
      id={3}
      {disabled}
      label="moog"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 3 }}
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
