<script lang="ts">
  import { Oscillator, Parameter, SobakaContext } from 'sobaka-sample-audio-worklet'
  import { getContext, onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'

  const { context } = get_module_context()

  const clock = new Oscillator(context, { wave: Oscillator.Wave.Clock })

  const loading = clock.node_id

  onDestroy(() => {
    void clock.dispose()
  })
</script>

<Panel name="clock" height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <CvParameter
      for_node={clock}
      for_input={Oscillator.Input.Frequency}
      default_value={1}
      default_range={[0, 10]}
    />
  {/await}

  <div slot="outputs">
    <Plug for_node={clock} />
  </div>
</Panel>
