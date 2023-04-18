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
  import Knob, { bpm } from '../components/Knob/Knob.svelte'
  import { get_context as get_audio_context } from '../audio'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'

  export let state: State
  let name = 'clock'
  let clock: OscillatorNode[] = []
  let freq_cv: AudioParam
  let loading = true
  const multiplier = [1.0, 2.0, 4.0, 8.0, 16.0]

  const context = get_audio_context()

  onMount(async () => {
    const frequency = new ConstantSourceNode($context)
    freq_cv = frequency.offset

    // @todo -- Not sure about it, they can all get out of sync pretty easily
    clock = [
      new OscillatorNode($context, { type: 'square' }),
      new OscillatorNode($context, { type: 'square' }),
      new OscillatorNode($context, { type: 'square' }),
      new OscillatorNode($context, { type: 'square' }),
      new OscillatorNode($context, { type: 'square' })
    ]
    loading = false

    let time = $context.currentTime

    clock.forEach(node => {
      frequency.connect(node.frequency, 0)
      node.start(time)
    })

    frequency.start(time)
  })

  $: {
    let time = $context.currentTime
    let freq = (state.bpm || 0) / 60
    clock?.forEach((node, index) => {
      node.frequency.setValueAtTime(freq * multiplier[index], time)
    })
  }
</script>

<Panel {name} height={8} width={5} custom_style={into_style(theme)}>
  <Layout type="center">
    {#if loading}
      <RingSpinner />
    {:else}
      <Knob bind:value={state.bpm} range={bpm} label="bpm" orientation="ns">
        <div slot="knob-inputs">
          <Plug id={0} label="bpm_cv" ctx={{ type: PlugType.Param, param: freq_cv }} />
        </div>
      </Knob>
    {/if}
  </Layout>

  <div slot="outputs">
    {#each clock as output, i}
      <Plug
        id={i}
        label={`1/${multiplier[i]}`}
        ctx={{
          type: PlugType.Output,
          module: output,
          connectIndex: 0
        }}
      />
    {/each}
  </div>
</Panel>
