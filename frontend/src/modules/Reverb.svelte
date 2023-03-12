<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }

  type State = {
    wet: number
    length: number
  }

  export const initialState: State = {
    wet: 0.1,
    length: 0.1
  }
</script>

<script lang="ts">
  import type { Reverb } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { get_context as get_audio_context } from '../audio'

  export let state: State
  let name = 'reverb'
  let reverb: Reverb
  let node: AudioNode
  let wet_param: AudioParam
  let delay_param: AudioParam
  let loading = true
  const context = get_audio_context()

  onMount(async () => {
    const { Reverb } = await import('sobaka-dsp')
    reverb = await Reverb.create($context)
    node = reverb.node()
    wet_param = reverb.get_param('Wet')
    delay_param = reverb.get_param('Delay')

    loading = false
  })

  // Update the sobaka node when the state changes
  $: wet = state.wet
  $: wet_param?.setValueAtTime(wet, $context.currentTime)

  $: delay = state.length
  $: delay_param?.setValueAtTime(delay, $context.currentTime)

  onDestroy(() => {
    reverb?.destroy()
    reverb?.free()
  })
</script>

<Panel {name} height={6} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <Knob bind:value={state.wet} range={[0, 1]} label="wet" />
      <Knob bind:value={state.length} range={[0, 10]} label="length" />
    </div>
  {/await}

  <div slot="inputs">
    <Plug
      id={0}
      label="l"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="r"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      label="l"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="r"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 1 }}
    />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
