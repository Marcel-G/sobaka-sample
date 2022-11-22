<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
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
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'

  let output: AudioNode
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    output = $context.createChannelMerger(2)
    loading = false

    output.connect($context.destination);
  })
</script>

<Panel name="output" height={7} width={20} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="oscilloscope-wrapper">
      <Oscilloscope module={output} />
    </div>
  {/if}

  <div slot="inputs">
    <Plug id={0} label="l" type={PlugType.Input} for_module={output} />
    <Plug id={1} label="r" type={PlugType.Input} for_module={output} />
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
