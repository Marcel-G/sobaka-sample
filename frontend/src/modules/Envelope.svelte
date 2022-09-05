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
  import type { Envelope } from 'sobaka-sample-audio-worklet'
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
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Envelope } = await import('sobaka-sample-audio-worklet')
    envelope = new Envelope($context, $state)
    await envelope.get_address()
    loading = false
  })

  const attack = state.select(s => s.attack)
  const decay = state.select(s => s.decay)
  const sustain = state.select(s => s.sustain)
  const release = state.select(s => s.release)

  // Update the sobaka node when the state changes
  $: void envelope?.message({ SetAttack: $attack })
  $: void envelope?.message({ SetDecay: $decay })
  $: void envelope?.message({ SetSustain: $sustain })
  $: void envelope?.message({ SetRelease: $release })

  onDestroy(() => {
    void envelope?.dispose()
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
    <Plug id={0} label="gate" type={PlugType.Input} for_module={envelope} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="envelope" type={PlugType.Output} for_module={envelope} />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
