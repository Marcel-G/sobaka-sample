<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = Readonly<{
    damping: 0.5
    decay: 0.5
  }>

  export const initialState: State = {
    damping: 0.5,
    decay: 0.5
  }
</script>

<script lang="ts">
  import type { String as SString } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'

  export let state: SubStore<State>
  let name = 'string'
  let string: SString
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { String } = await import('sobaka-sample-audio-worklet')
    string = new String($context, {
      damping: $state.damping,
      gain_per_second: $state.decay
    })
    await string.get_address()
    loading = false
  })

  const decay = state.select(s => s.decay)
  const damping = state.select(s => s.damping)

  // Update the sobaka node when the state changes
  $: void string?.message({ SetGainPerSecond: $decay })
  $: void string?.message({ SetDamping: $damping })

  // const loading = string.get_address()

  onDestroy(() => {
    void string?.dispose()
  })
</script>

<Panel {name} height={9} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <Knob bind:value={$damping} range={[0, 1]} label="damping" />
    <Knob bind:value={$decay} range={[0, 1]} label="decay" />
  {/if}
  <div slot="inputs">
    <Plug id={0} label="excitation" type={PlugType.Input} for_module={string} />
    <Plug id={1} label="pitch" type={PlugType.Input} for_module={string} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="output" type={PlugType.Output} for_module={string} />
  </div>
</Panel>
