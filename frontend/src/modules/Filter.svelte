<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }

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
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../context/plugs'
  import Knob from '../components/Knob/Knob.svelte'
  import { get_context as get_audio_context } from '../audio'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import {
    createScaleRange,
    createVoltPerOctaveRange
  } from '../components/Knob/range/rangeCreators'

  export let state: State
  let name = 'filter'
  let filter: Filter
  let node: AudioNode
  let frequency_param: AudioParam
  let q_param: AudioParam
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Filter } = await import('sobaka-dsp')
    filter = await Filter.create($context)
    node = filter.node()
    frequency_param = filter.get_param('Frequency')
    q_param = filter.get_param('Q')
    loading = false
  })

  // Update the sobaka node when the state changes
  $: frequency = state.frequency
  $: frequency_param?.setValueAtTime(frequency, $context.currentTime)
  $: q = state.q
  $: q_param?.setValueAtTime(q, $context.currentTime)

  const freq_range = createVoltPerOctaveRange()
  const scalar = createScaleRange()

  onDestroy(() => {
    filter?.destroy()
    filter?.free()
  })
</script>

<Panel {name} height={8} width={8} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <div class="controls">
      <Knob
        bind:value={state.frequency}
        range={freq_range}
        label="cutoff"
        orientation="ns"
      >
        <div slot="knob-inputs">
          <Plug
            id={1}
            label="cutoff_cv"
            ctx={{ type: PlugType.Param, param: frequency_param }}
          />
        </div>
      </Knob>
      <Knob bind:value={state.q} range={scalar} label="q" orientation="ns">
        <div slot="knob-inputs">
          <Plug id={2} label="q_cv" ctx={{ type: PlugType.Param, param: q_param }} />
        </div>
      </Knob>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      label="signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      label="lowpass"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="highpass"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 1 }}
    />
    <Plug
      id={2}
      label="bandpass"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 2 }}
    />
    <Plug
      id={3}
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
