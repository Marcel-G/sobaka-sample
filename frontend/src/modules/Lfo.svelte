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
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { get_context as get_audio_context } from '../audio'

  export let state: State
  let name = 'lfo'
  let lfo: OscillatorNode
  let loading = false

  const context = get_audio_context()

  onMount(async () => {
    lfo = new OscillatorNode($context, { type: 'sine' })

    loading = false

    lfo.start()
  })

  // Update the sobaka node when the state changes
  $: bpm = state.bpm
  $: lfo?.frequency.setValueAtTime((bpm || 0) / 60, $context.currentTime)
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <Knob bind:value={state.bpm} range={[0, 600]} label="bpm">
      <div slot="inputs">
        <Plug
          id={1}
          label="bpm_cv"
          ctx={{ type: PlugType.Param, param: lfo?.frequency }}
        />
      </div>
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
