<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)'
  }
</script>

<script lang="ts">
  import { SampleAndHold } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const sample_and_hold = new SampleAndHold(context)

  const loading = sample_and_hold.node_id

  onDestroy(() => {
    void sample_and_hold.dispose()
  })
</script>

<Panel name="S & H" height={2} width={2} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    🧿
  {/await}

  <div slot="inputs">
    <Plug for_node={sample_and_hold} for_input={'Signal'} />
    <Plug for_node={sample_and_hold} for_input={'Gate'} />
  </div>

  <div slot="outputs">
    <Plug for_node={sample_and_hold} />
  </div>
</Panel>
