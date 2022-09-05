<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }

  type State = Readonly<{
    wet: number
    length: number
  }>

  export const initialState: State = {
    wet: 0.1,
    length: 0.1
  }
</script>

<script lang="ts">
  import type { Reverb } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'

  export let state: SubStore<State>
  let name = 'reverb'
  let reverb: Reverb
  let loading = true
  const context = get_audio_context()

  onMount(async () => {
    const { Reverb } = await import('sobaka-sample-audio-worklet')
    reverb = new Reverb($context, $state)
    await reverb.get_address()
    loading = false
  })

  const wet = state.select(s => s.wet)
  const length = state.select(s => s.length)

  // Update the sobaka node when the state changes
  $: void reverb?.message({ SetWet: $wet })
  $: void reverb?.message({ SetDelay: $length })

  onDestroy(() => {
    void reverb?.dispose()
  })
</script>

<Panel {name} height={6} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <Knob bind:value={$wet} range={[0, 1]} label="wet" />
      <Knob bind:value={$length} range={[0, 10]} label="length" />
    </div>
  {/await}

  <div slot="inputs">
    <Plug id={0} label="l" type={PlugType.Input} for_module={reverb} />
    <Plug id={1} label="r" type={PlugType.Input} for_module={reverb} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="l" type={PlugType.Output} for_module={reverb} />
    <Plug id={1} label="r" type={PlugType.Output} for_module={reverb} />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
