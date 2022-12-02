<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import type { NoiseNode } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'

  let noise: NoiseNode
  let node: AudioNode
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { NoiseNode } = await import('sobaka-sample-audio-worklet')
    noise = await NoiseNode.install($context)
    node = noise.node()
    loading = false
  })

  onDestroy(() => {
    noise?.destroy()
    noise?.free()
  })
</script>

<Panel name="noise" height={5} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    💥
  {/if}

  <div slot="outputs">
    <Plug id={0} label="Noise" ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }} />
  </div>
</Panel>
