<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)'
  }
</script>

<script lang="ts">
  import { Sink } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const sink = new Sink(context)

  const loading = sink.node_id

  onDestroy(() => {
    void sink.dispose()
  })
</script>

<Panel name="sink" height={2} width={2} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    🔊
  {/await}

  <div slot="inputs">
    <Plug for_node={sink} for_input={'Signal'} />
  </div>
</Panel>
