<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import { SampleAndHold } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'

  const name = 'S & H'
  let sample_and_hold: SampleAndHold
  let node: AudioNode
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { SampleAndHold } = await import('sobaka-dsp')
    sample_and_hold = await SampleAndHold.create($context)
    node = sample_and_hold.node()
    loading = false
  })

  onDestroy(() => {
    sample_and_hold?.destroy()
    sample_and_hold?.free()
  })
</script>

<Panel {name} height={4} width={4} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    🧿
  {/if}

  <div slot="inputs">
    <Plug
      id={0}
      label="Signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="Gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      label="Output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>
