<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = { min: number; max: number; value: number }

  export const initialState: State = {
    min: 0,
    max: 10,
    value: 0.5
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Plug from './shared/Plug.svelte'
  import Panel from './shared/Panel.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../context/plugs'
  import { get_context as get_audio_context } from '../audio'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { create_scale_range } from '../range/range_creators'

  const context = get_audio_context()

  export let state: State
  let name = 'parameter'
  let parameter: ConstantSourceNode
  let loading = true

  onMount(async () => {
    parameter = new ConstantSourceNode($context)
    parameter.start()
    loading = false
  })

  $: param_range = create_scale_range(state.min, state.max)

  // Update the sobaka node when the state changes
  $: value = state.value
  $: parameter?.offset.setValueAtTime(value, $context.currentTime)
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <span>
      <Knob bind:value={state.value} range={param_range} label="value" />
    </span>
  {/if}
  <div slot="outputs">
    <Plug
      id={0}
      label="output"
      ctx={{ type: PlugType.Output, connectIndex: 0, module: parameter }}
    />
  </div>
</Panel>
