<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>

<script lang="ts">
  import { Oscillator } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const clock = new Oscillator(context, { wave: 'Clock' })

  const loading = clock.node_id

  onDestroy(() => {
    void clock.dispose()
  })
</script>

<Panel name="clock" height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <CvParameter
      for_node={clock}
      for_input={'Frequency'}
      default_value={1}
      default_range={[0, 10]}
    />
  {/await}

  <div slot="outputs">
    <Plug for_node={clock} />
  </div>
</Panel>
