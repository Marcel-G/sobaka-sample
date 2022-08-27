<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = Readonly<{ bpm: number }>

  export const initialState: State = { bpm: 120 }
</script>

<script lang="ts">
  import type { Lfo } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { SubStore } from '../utils/patches'
  import { get_audio_context } from '../routes/workspace/[slug]/+layout.svelte'

  export let state: SubStore<State>
  let name = 'lfo'
  let lfo: Lfo
  let loading = false

  const context = get_audio_context()

  onMount(async () => {
    const { Lfo } = await import('sobaka-sample-audio-worklet')
    lfo = new Lfo($context, $state)
    await lfo.get_address()
    loading = false
  })

  const bpm = state.select(s => s.bpm)

  // Update the sobaka node when the state changes
  $: void lfo?.message({ SetBPM: $bpm })

  onDestroy(() => {
    void lfo?.dispose()
  })
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <Knob bind:value={$bpm} range={[0, 600]} label="bpm">
      <div slot="inputs">
        <Plug id={1} label="bpm_cv" type={PlugType.Input} for_module={lfo} />
      </div>
    </Knob>
  {/if}

  <div slot="inputs">
    <Plug id={0} label="reset" type={PlugType.Input} for_module={lfo} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="signal" type={PlugType.Output} for_module={lfo} />
  </div>
</Panel>
