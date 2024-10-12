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
  import { PlugType } from '../../context/plugs'
  import { get_context as get_audio_context } from '../../audio'
  import Layout from '../../components/Layout.svelte'
  import RingSpinner from '../../components/RingSpinner.svelte'
  import Graph from './Graph.svelte'
  import Input from '../../components/Input.svelte'
  import { create_scale_range, create_time_range } from '../../range/range_creators'
  import Tooltip from '../../components/Tooltip.svelte'

  export let state: State
  let name = 'envelope'
  let envelope: Envelope
  let node: AudioNode
  let attack_param: AudioParam
  let decay_param: AudioParam
  let sustain_param: AudioParam
  let release_param: AudioParam
  let loading = true

  let trigger_on: () => void
  let trigger_off: () => void

  const context = get_audio_context()

  const duration = create_time_range()
  const scalar = create_scale_range()

  onMount(async () => {
    const { Envelope } = await import('sobaka-dsp')
    envelope = await Envelope.create($context)
    node = envelope.node()
    attack_param = envelope.get_param('Attack')
    decay_param = envelope.get_param('Decay')
    sustain_param = envelope.get_param('Sustain')
    release_param = envelope.get_param('Release')
    loading = false

    // Subscribe to step change
    envelope.subscribe(event => {
      if (event === 'NoteOn') {
        trigger_on()
      } else {
        trigger_off()
      }
    })
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
        bind:trigger_on
        bind:trigger_off
        attack={state.attack}
        decay={state.decay}
        sustain={state.sustain}
        release={state.release}
      />
      <div class="values">
        <div class="input">
          <Tooltip label="attack" position="left">
            <Input bind:value={state.attack} range={duration} />
          </Tooltip>
        </div>
        <div class="input">
          <Tooltip label="decay">
            <Input bind:value={state.decay} range={duration} />
          </Tooltip>
        </div>
        <div class="input">
          <Tooltip label="sustain">
            <Input bind:value={state.sustain} range={scalar} />
          </Tooltip>
        </div>
        <div class="input">
          <Tooltip label="release">
            <Input bind:value={state.release} range={duration} />
          </Tooltip>
        </div>
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
    display: flex;
    flex-direction: column;
    height: 100%;
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
