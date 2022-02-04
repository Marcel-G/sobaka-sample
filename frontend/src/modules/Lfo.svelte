<script lang="ts">
  import { Oscillator } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'

  const { context } = get_module_context()

  const oscillator = new Oscillator(context, { wave: Oscillator.Wave.Lfo })

  const loading = oscillator.node_id

  onDestroy(() => {
    void oscillator.dispose()
  })
</script>

<Panel name="lfo" height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <CvParameter
      for_node={oscillator}
      for_input={Oscillator.Input.Frequency}
      default_value={1}
      default_range={[0, 10]}
    />
  {/await}
  <div slot="outputs">
    <Plug for_node={oscillator} />
  </div>
</Panel>
