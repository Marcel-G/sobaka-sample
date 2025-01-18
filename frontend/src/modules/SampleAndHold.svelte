<script context="module" lang="ts">
  import type { ModuleTheme } from './ThemeProvider.svelte'
  export const theme: Partial<ModuleTheme> = {
    primary: 'var(--cyan)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import { SampleAndHold } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { PlugType } from '../context/plugs'
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'

  export let disabled = false
  const name = 'S & H'
  let sample_and_hold: SampleAndHold
  let node: AudioNode
  let loading = true

  const context = getGlobalCtx()

  onMount(async () => {
    const { SampleAndHold } = await import('sobaka-dsp')
    sample_and_hold = await SampleAndHold.create(context.audio)
    node = sample_and_hold.node()
    loading = false
  })

  onDestroy(() => {
    sample_and_hold?.destroy()
    sample_and_hold?.free()
  })
</script>

<Panel {name} height={4} width={4} {disabled} {theme}>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <Layout type="center">🧿</Layout>
  {/if}

  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="Signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      {disabled}
      label="Gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="Output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>
