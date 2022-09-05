<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import type { SampleAndHold } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'

  const name = 'S & H'
  let sample_and_hold: SampleAndHold
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { SampleAndHold } = await import('sobaka-sample-audio-worklet')
    sample_and_hold = new SampleAndHold($context)
    await sample_and_hold.get_address()
    loading = false
  })

  onDestroy(() => {
    void sample_and_hold?.dispose()
  })
</script>

<Panel {name} height={4} width={4} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    🧿
  {/if}

  <div slot="inputs">
    <Plug id={0} label="Signal" type={PlugType.Input} for_module={sample_and_hold} />
    <Plug id={1} label="Gate" type={PlugType.Input} for_module={sample_and_hold} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={sample_and_hold} />
  </div>
</Panel>
