<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = { bpm: number }

  export const initialState: State = { bpm: 120 }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../context/plugs'
  import Knob from '../components/Knob/Knob.svelte'
  import { get_context as get_audio_context } from '../audio'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { createBpmRange } from '../components/Knob/range/rangeCreators'
  import { Clock } from 'sobaka-dsp'

  export let state: State
  let clock: Clock
  let name = 'clock'
  let bpm_param: AudioParam
  let node: AudioNode
  let loading = true

  const context = get_audio_context()

  // @todo -- make this work with volt per octave
  const bpm = createBpmRange()

  onMount(async () => {
    clock = await Clock.create($context)
    node = clock.node()
    bpm_param = clock.get_param('Bpm')

    loading = false
  })

  $: bpm_param?.setValueAtTime(state.bpm, $context.currentTime)
</script>

<Panel {name} height={8} width={5} custom_style={into_style(theme)}>
  <Layout type="center">
    {#if loading}
      <RingSpinner />
    {:else}
      <Knob bind:value={state.bpm} range={bpm} label="bpm" orientation="ns">
        <div slot="knob-inputs">
          <Plug id={0} label="bpm_cv" ctx={{ type: PlugType.Param, param: bpm_param }} />
        </div>
      </Knob>
    {/if}
  </Layout>

  <div slot="outputs">
    <Plug
      id={0}
      label="1/1"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="1/2"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 1 }}
    />
    <Plug
      id={2}
      label="1/4"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 2 }}
    />
    <Plug
      id={3}
      label="1/8"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 3 }}
    />
    <Plug
      id={4}
      label="1/16"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 4 }}
    />
  </div>
</Panel>
