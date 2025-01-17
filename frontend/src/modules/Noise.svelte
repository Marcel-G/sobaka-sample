<script context="module" lang="ts">
  import { type ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import type { Noise } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../context/plugs'
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'

  export let disabled = false
  let noise: Noise
  let node: AudioNode
  let loading = true

  const context = getGlobalCtx()

  onMount(async () => {
    const { Noise } = await import('sobaka-dsp')
    noise = await Noise.create(context.audio)
    node = noise.node()
    loading = false
  })

  onDestroy(() => {
    noise?.destroy()
    noise?.free()
  })
</script>

<Panel name="noise" height={5} width={5} {disabled} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <Layout type="center">💥</Layout>
  {/if}

  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="Noise"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>
