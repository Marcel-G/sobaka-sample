<script lang="ts">
  import { Noise } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'

  const { context } = get_module_context()

  const noise = new Noise(context)

  const loading = noise.node_id

  onDestroy(() => {
    void noise.dispose()
  })
</script>

<Panel name="noise" height={2} width={2}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    🤖
  {/await}

  <div slot="outputs">
    <Plug for_node={noise} />
  </div>
</Panel>
