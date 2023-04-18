<script context="module" lang="ts">
  import { ModuleTheme } from '../../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--yellow)',
    background: 'var(--yellow-dark)'
  }

  type State = {
    attack: number
    decay: number
    sustain: number
    release: number
  }

  export const initialState: State = {
    attack: 0.1,
    decay: 0.1,
    sustain: 0.1,
    release: 0.1
  }
</script>

<script lang="ts">
  import { Envelope } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import { into_style } from '../../components/Theme.svelte'
  import { PlugType } from '../../workspace/plugs'
  import { scalar } from '../../components/Knob/Knob.svelte'
  import { get_context as get_audio_context } from '../../audio'
  import Layout from '../../components/Layout.svelte'
  import RingSpinner from '../../components/RingSpinner.svelte'
  import Graph from './Graph.svelte'
  import Input from '../../components/Knob/Input.svelte'

  export let state: State
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
    const { Envelope } = await import('sobaka-dsp')
    envelope = await Envelope.create($context)
    node = envelope.node()
    attack_param = envelope.get_param('Attack')
    decay_param = envelope.get_param('Decay')
    sustain_param = envelope.get_param('Sustain')
    release_param = envelope.get_param('Release')
    loading = false
  })

  // Update the sobaka node when the state changes
  $: attack_param?.setValueAtTime(state.attack, $context.currentTime)
  $: decay_param?.setValueAtTime(state.decay, $context.currentTime)
  $: sustain_param?.setValueAtTime(state.sustain, $context.currentTime)
  $: release_param?.setValueAtTime(state.release, $context.currentTime)

  onDestroy(() => {
    envelope?.destroy()
    envelope?.free()
  })
</script>

<Panel {name} height={10} width={16} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <div class="controls">
      <Graph
        bind:attack={state.attack}
        bind:decay={state.decay}
        bind:sustain={state.sustain}
        bind:release={state.release}
      />
    </div>
    <div class="values">
      <div class="input">
        <Input bind:value={state.attack} range={scalar} />
      </div>
      <div class="input">
        <Input bind:value={state.decay} range={scalar} />
      </div>
      <div class="input">
        <Input bind:value={state.sustain} range={scalar} />
      </div>
      <div class="input">
        <Input bind:value={state.release} range={scalar} />
      </div>
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
    overflow: hidden;
  }

  .values {
    display: flex;
    flex-direction: row;
  }

  .input {
    display: inline-flex;
    font-size: 0.75rem;
    font-family: monospace;
  }
</style>
