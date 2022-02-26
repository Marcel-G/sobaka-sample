<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)'
  }
</script>

<script lang="ts">
  import { Noise } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context } = get_module_context()

  const noise = new Noise(context)

  const loading = noise.node_id

  onDestroy(() => {
    void noise.dispose()
  })
</script>

<Panel name="noise" height={2} width={2} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    🤖
  {/await}

  <div slot="outputs">
    <Plug for_node={noise} />
  </div>
</Panel>
