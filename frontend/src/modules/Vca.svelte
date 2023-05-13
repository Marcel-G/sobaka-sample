<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }

  type State = { value: number }

  export const initialState: State = {
    value: 0.5
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { createScaleRange } from '../components/Knob/range/rangeCreators'

  export let state: State
  let name = 'vca'
  let vca: GainNode
  let gain_param: AudioParam
  let loading = true

  const context = get_audio_context()

  const attenuverter = createScaleRange(-1, 1)

  onMount(async () => {
    vca = new GainNode($context)
    gain_param = vca.gain
    loading = false
  })

  $: gain = state.value
  $: gain_param?.setValueAtTime(gain || 0, $context.currentTime)
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <span>
      <Knob bind:value={state.value} range={attenuverter} label="attenuverter" />
    </span>
  {/if}

  <div slot="inputs">
    <Plug
      id={0}
      label="Signal"
      ctx={{ type: PlugType.Input, module: vca, connectIndex: 0 }}
    />
    <Plug id={1} label="Cv" ctx={{ type: PlugType.Param, param: gain_param }} />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      label="Output"
      ctx={{ type: PlugType.Output, module: vca, connectIndex: 0 }}
    />
  </div>
</Panel>
