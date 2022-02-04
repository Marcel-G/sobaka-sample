<script lang="ts">
  import { Volume } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'

  const { context } = get_module_context()

  const volume = new Volume(context)

  const loading = volume.node_id

  onDestroy(() => {
    void volume.dispose()
  })
</script>

<Panel name="vca" height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <CvParameter
      for_node={volume}
      for_input={Volume.Input.Level}
      default_value={0}
      default_range={[0, 10]}
    />
  {/await}

  <div slot="inputs">
    <Plug for_node={volume} for_input={Volume.Input.Signal} />
  </div>

  <div slot="outputs">
    <Plug for_node={volume} />
  </div>
</Panel>
