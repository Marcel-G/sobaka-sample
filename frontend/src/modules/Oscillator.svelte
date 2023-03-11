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
  import type { Oscillator } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { get_context as get_audio_context } from '../audio'

  export let state: State
  let name = 'oscillator'
  let oscillator: Oscillator
  let node: AudioNode
  let pitch_param: AudioParam
  let saw_param: AudioParam
  let sine_param: AudioParam
  let square_param: AudioParam
  let triangle_param: AudioParam
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Oscillator } = await import('sobaka-dsp')
    oscillator = await Oscillator.create($context)
    node = oscillator.node()
    pitch_param = oscillator.get_param('Pitch')
    saw_param = oscillator.get_param('Saw')
    sine_param = oscillator.get_param('Sine')
    square_param = oscillator.get_param('Square')
    triangle_param = oscillator.get_param('Triangle')
    loading = false
  })

  const pitch = state.select(s => s.pitch)
  const saw = state.select(s => s.saw)
  const sine = state.select(s => s.sine)
  const square = state.select(s => s.square)
  const triangle = state.select(s => s.triangle)

  // Update the sobaka node when the state changes
  $: pitch_param?.setValueAtTime($pitch, 0)
  $: saw_param?.setValueAtTime($saw, 0)
  $: sine_param?.setValueAtTime($sine, 0)
  $: square_param?.setValueAtTime($square, 0)
  $: triangle_param?.setValueAtTime($triangle, 0)

  onDestroy(() => {
    oscillator?.destroy()
    oscillator?.free()
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
    <Plug
      id={0}
      label="pitch_1 cv"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
    <!-- @todo polyphony
      <Plug id={2} label="pitch_2 cv" type={PlugType.Input} for_module={oscillator} />
      <Plug id={3} label="pitch_3 cv" type={PlugType.Input} for_module={oscillator} />
      <Plug id={4} label="pitch_4 cv" type={PlugType.Input} for_module={oscillator} />
    -->
    <Plug
      id={1}
      label="reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      label="output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>
