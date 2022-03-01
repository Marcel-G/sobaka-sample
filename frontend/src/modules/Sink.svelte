<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>
<style>
  .oscilloscope-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 0.5rem;
  }
</style>

<script lang="ts">
  import { Sink } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Oscilloscope from '../components/Oscilloscope.svelte';

  const { context } = get_module_context()

  const sink = new Sink(context)

  const loading = sink.node_id

  onDestroy(() => {
    void sink.dispose()
  })
</script>

<Panel name="sink" height={7} width={20} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="oscilloscope-wrapper">
      <Oscilloscope />
    </div>
  {/await}

  <div slot="inputs">
    <Plug for_node={sink} for_input={'Signal'} />
  </div>
</Panel>
