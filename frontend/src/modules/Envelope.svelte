<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--yellow)',
    background: 'var(--yellow-dark)'
  }

  type State = Readonly<{
    attack: number
    decay: number
    sustain: number
    release: number
  }>

  export const initialState: State = {
    attack: 0.1,
    decay: 0.1,
    sustain: 0.1,
    release: 0.1
  }
</script>

<script lang="ts">
  import { Envelope } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'

  export let state: SubStore<State>
  let name = 'envelope'
  let envelope: Envelope
  let node: AudioNode
  let attack_param: AudioParam
  let decay_param: AudioParam
  let sustain_param: AudioParam
  let release_param: AudioParam
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Envelope } = await import('sobaka-sample-audio-worklet')
    envelope = await Envelope.install($context)
    node = envelope.node()
    attack_param = envelope.get_param('Attack')
    decay_param = envelope.get_param('Decay')
    sustain_param = envelope.get_param('Sustain')
    release_param = envelope.get_param('Release')
    loading = false
  })

  const attack = state.select(s => s.attack)
  const decay = state.select(s => s.decay)
  const sustain = state.select(s => s.sustain)
  const release = state.select(s => s.release)

  // Update the sobaka node when the state changes
  $: attack_param?.setValueAtTime($attack, $context.currentTime)
  $: decay_param?.setValueAtTime($decay, $context.currentTime)
  $: sustain_param?.setValueAtTime($sustain, $context.currentTime)
  $: release_param?.setValueAtTime($release, $context.currentTime)

  onDestroy(() => {
    envelope?.destroy()
    envelope?.free()
  })
</script>

<Panel {name} height={9} width={8} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="controls">
      <Knob bind:value={$attack} range={[0, 1]} label="attack" />
      <Knob bind:value={$decay} range={[0, 1]} label="decay" />
      <Knob bind:value={$sustain} range={[0, 1]} label="sustain" />
      <Knob bind:value={$release} range={[0, 1]} label="release" />
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      label="gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      label="envelope"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
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
