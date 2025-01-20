<script context="module" lang="ts">
  import type { ModuleTheme } from './ThemeProvider.svelte'
  export const theme: Partial<ModuleTheme> = {
    primary: 'var(--pink)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Oscilloscope from '../components/Oscilloscope.svelte'
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { PlugType } from '../models/workspace'

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

<Panel name="output" height={7} width={20} {disabled} {theme}>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
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
