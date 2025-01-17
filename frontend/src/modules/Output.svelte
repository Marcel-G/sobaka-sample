<script context="module" lang="ts">
  import { type ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Oscilloscope from '../components/Oscilloscope.svelte'
  import { PlugType } from '../context/plugs'
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'

  export let disabled = false
  let output: AudioNode
  let loading = true

  const context = getGlobalCtx()

  onMount(async () => {
    output = context.audio.createChannelMerger(2)
    loading = false

    output.connect(context.audio.destination)
  })
</script>

<Panel name="output" height={7} width={20} {disabled} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <div class="oscilloscope-wrapper">
      <Oscilloscope module={output} />
    </div>
  {/if}

  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="l"
      ctx={{ type: PlugType.Input, connectIndex: 0, module: output }}
    />
    <Plug
      id={1}
      {disabled}
      label="r"
      ctx={{ type: PlugType.Input, connectIndex: 1, module: output }}
    />
  </div>
</Panel>

<style>
  .oscilloscope-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 0.5rem;
  }
</style>
