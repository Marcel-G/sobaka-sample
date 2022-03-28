<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }
</script>

<script lang="ts">
  import { Delay } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const delay = new Delay(context)

  const loading = delay.node_id

  onDestroy(() => {
    void delay.dispose()
  })
</script>

<Panel name="delay" height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <CvParameter
      for_node={delay}
      for_input={'Time'}
      default_value={0.5}
      default_range={[0, 10]}
    />
  {/await}

  <div slot="inputs">
    <Plug for_node={delay} for_input={'Signal'} />
  </div>

  <div slot="outputs">
    <Plug for_node={delay} />
  </div>
</Panel>
