<script context="module" lang="ts">
  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import type { Noise } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { PlugType } from '../models/links'

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

<Panel
  name="noise"
  {disabled}
  height={5}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
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
