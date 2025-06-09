<script context="module" lang="ts">
  type State = { value: number }

  export const initialState: State = {
    value: 0.5
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { create_bipolar_scale_range } from '../range/range_creators'
  import { PlugType } from '../models/links'

  export let state: State
  export let disabled = false
  let name = 'vca'
  let vca: GainNode
  let gain_param: AudioParam
  let loading = true

  const context = getGlobalCtx()

  const attenuverter = create_bipolar_scale_range()

  onMount(async () => {
    vca = new GainNode(context.audio)
    gain_param = vca.gain
    loading = false
  })

  $: gain = state.value
  $: gain_param?.setValueAtTime(gain || 0, context.audio.currentTime)
</script>

<Panel
  {name}
  height={6}
  width={5}
  {disabled}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <span>
      <Knob
        {disabled}
        bind:value={state.value}
        range={attenuverter}
        label="attenuverter"
      />
    </span>
  {/if}

  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="Signal"
      ctx={{ type: PlugType.Input, module: vca, connectIndex: 0 }}
    />
    <Plug
      id={1}
      {disabled}
      label="Cv"
      ctx={{ type: PlugType.Param, param: gain_param }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="Output"
      ctx={{ type: PlugType.Output, module: vca, connectIndex: 0 }}
    />
  </div>
</Panel>
