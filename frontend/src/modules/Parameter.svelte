<script context="module" lang="ts">
  import { type ModuleTheme } from '../components/Theme.svelte'
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
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { create_scale_range } from '../range/range_creators'

  const context = getGlobalCtx()

  export let state: State
  export let disabled = false
  let name = 'parameter'
  let parameter: ConstantSourceNode
  let loading = true

  onMount(async () => {
    parameter = new ConstantSourceNode(context.audio)
    parameter.start()
    loading = false
  })

  $: param_range = create_scale_range(state.min, state.max)

  // Update the sobaka node when the state changes
  $: value = state.value
  $: parameter?.offset.setValueAtTime(value, context.audio.currentTime)
</script>

<Panel {name} height={6} width={5} {disabled} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <span>
      <Knob {disabled} bind:value={state.value} range={param_range} label="value" />
    </span>
  {/if}
  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="output"
      ctx={{ type: PlugType.Output, connectIndex: 0, module: parameter }}
    />
  </div>
</Panel>
