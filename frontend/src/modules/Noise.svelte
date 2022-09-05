<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import type { Noise } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'

  let noise: Noise
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Noise } = await import('sobaka-sample-audio-worklet')
    noise = new Noise($context)
    await noise.get_address()
    loading = false
  })

  onDestroy(() => {
    void noise?.dispose()
  })
</script>

<Panel name="noise" height={5} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    💥
  {/if}

  <div slot="outputs">
    <Plug id={0} label="Noise" type={PlugType.Output} for_module={noise} />
  </div>
</Panel>
