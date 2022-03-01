<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--yellow)',
    background: 'var(--yellow-dark)'
  }
</script>

<script lang="ts">
  import { Envelope } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const envelope = new Envelope(context)

  const loading = envelope.node_id

  onDestroy(() => {
    void envelope.dispose()
  })
</script>

<Panel name="adsr" height={9} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <CvParameter
        for_node={envelope}
        for_input={'Attack'}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={envelope}
        for_input={'Decay'}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={envelope}
        for_input={'Sustain'}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={envelope}
        for_input={'Release'}
        default_value={0.5}
        default_range={[0, 1]}
      />
    </div>
  {/await}

  <div slot="inputs">
    <Plug for_node={envelope} for_input={'Gate'} />
  </div>

  <div slot="outputs">
    <Plug for_node={envelope} />
  </div>
</Panel>
