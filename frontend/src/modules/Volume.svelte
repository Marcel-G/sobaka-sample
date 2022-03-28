<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }
</script>

<script lang="ts">
  import { Volume } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const volume = new Volume(context)

  const loading = volume.node_id

  onDestroy(() => {
    void volume.dispose()
  })
</script>

<Panel name="vca" height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <CvParameter
      for_node={volume}
      for_input={'Level'}
      default_value={0}
      default_range={[-1, 1]}
    />
  {/await}

  <div slot="inputs">
    <Plug for_node={volume} for_input={'Signal'} />
  </div>

  <div slot="outputs">
    <Plug for_node={volume} />
  </div>
</Panel>
