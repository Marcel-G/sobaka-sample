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

  export let state: State
  let name = 'lfo'
  let lfo: OscillatorNode
  let loading = true

  const context = get_audio_context()

  // @todo -- make this work with volt per octave
  const lfo_range = createBpmRange(0, 600)

  onMount(async () => {
    lfo = new OscillatorNode($context, { type: 'sine' })

    loading = false

    lfo.start()
  })

  // Update the sobaka node when the state changes
  $: lfo?.frequency.setValueAtTime((state.bpm || 0) / 60, $context.currentTime)
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <Knob bind:value={state.bpm} range={lfo_range} label="bpm">
      <!-- <div slot="inputs">
        <Plug
          id={1}
          label="bpm_cv"
          ctx={{ type: PlugType.Param, param: lfo?.frequency }}
        />
      </div> -->
    </Knob>
  {/if}
  <!-- @todo can't do reset with OscillatorNode?
  <div slot="inputs">
    <Plug id={0} label="reset" ctx={{ type: PlugType.Input, connectIndex: 0, module: lfo }} />
  </div> -->

  <div slot="outputs">
    <Plug
      id={0}
      label="signal"
      ctx={{ type: PlugType.Output, connectIndex: 0, module: lfo }}
    />
  </div>
</Panel>
