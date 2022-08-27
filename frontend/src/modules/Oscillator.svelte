<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = Readonly<{
    sine: number
    square: number
    saw: number
    triangle: number
    pitch: number
  }>

  export const initialState: State = {
    sine: 0,
    square: 0,
    saw: 0,
    triangle: 0,
    pitch: 0
  }
</script>

<script lang="ts">
  import type { Oscillator } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { SubStore } from '../utils/patches'
  import { get_audio_context } from '../routes/workspace/[slug]/+layout.svelte'

  export let state: SubStore<State>
  let name = 'oscillator'
  let oscillator: Oscillator
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Oscillator } = await import('sobaka-sample-audio-worklet')
    oscillator = new Oscillator($context, $state)
    await oscillator.get_address()
    loading = false
  })

  const pitch = state.select(s => s.pitch)
  const saw = state.select(s => s.saw)
  const sine = state.select(s => s.sine)
  const square = state.select(s => s.square)
  const triangle = state.select(s => s.triangle)

  // Update the sobaka node when the state changes
  $: void oscillator?.message({ SetPitch: $pitch })
  $: void oscillator?.message({ SetSawLevel: $saw })
  $: void oscillator?.message({ SetSineLevel: $sine })
  $: void oscillator?.message({ SetSquareLevel: $square })
  $: void oscillator?.message({ SetTriangleLevel: $triangle })

  onDestroy(() => {
    void oscillator?.dispose()
  })
</script>

<Panel {name} height={18} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <Knob bind:value={$pitch} range={[0, 4]} label="pitch" />
    <Knob bind:value={$saw} range={[0, 1]} label="saw" />
    <Knob bind:value={$sine} range={[0, 1]} label="sine" />
    <Knob bind:value={$square} range={[0, 1]} label="square" />
    <Knob bind:value={$triangle} range={[0, 1]} label="triangle" />
  {/if}
  <div slot="inputs">
    <Plug id={1} label="pitch_1 cv" type={PlugType.Input} for_module={oscillator} />
    <!-- @todo polyphony
      <Plug id={2} label="pitch_2 cv" type={PlugType.Input} for_module={oscillator} />
      <Plug id={3} label="pitch_3 cv" type={PlugType.Input} for_module={oscillator} />
      <Plug id={4} label="pitch_4 cv" type={PlugType.Input} for_module={oscillator} />
    -->
    <Plug id={0} label="reset" type={PlugType.Input} for_module={oscillator} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="output" type={PlugType.Output} for_module={oscillator} />
  </div>
</Panel>
