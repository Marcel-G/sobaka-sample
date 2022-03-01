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
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }
</script>

<script lang="ts">
  import { Reverb } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const reverb = new Reverb(context)

  const loading = reverb.node_id

  onDestroy(() => {
    void reverb.dispose()
  })
</script>

<Panel name="reverb" height={12} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <CvParameter
        for_node={reverb}
        for_input={'Dampening'}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={'Dry'}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={'Wet'}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={'RoomSize'}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={'Width'}
        default_value={0.5}
        default_range={[0, 1]}
      />
    </div>
  {/await}

  <div slot="inputs">
    <Plug for_node={reverb} for_input={'Signal'} />
  </div>

  <div slot="outputs">
    <Plug for_node={reverb} />
  </div>
</Panel>
