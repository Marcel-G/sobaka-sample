<script lang="ts">
  import { Oscillator } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Dropdown from '../components/Dropdown.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'

  let name = 'oscillator'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let { wave } = get_sub_state<Oscillator['state']>(name) || {
    wave: Oscillator.Wave.Sine
  }

  const oscillator = new Oscillator(context, { wave })

  const loading = oscillator.node_id

  // Update the sobaka node when the state changes
  $: void oscillator.update({ wave })

  // Update the global state when state changes
  $: update_sub_state(name, { wave })

  onDestroy(() => {
    void oscillator.dispose()
  })
</script>

<Panel {name} height={4} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Dropdown
      options={[Oscillator.Wave.Saw, Oscillator.Wave.Sine, Oscillator.Wave.Square]}
      bind:selected={wave}
    />
    <CvParameter
      for_node={oscillator}
      for_input={Oscillator.Input.Frequency}
      default_value={1}
      default_range={[0, 10]}
    />
  {/await}
  <div slot="outputs">
    <Plug name="output" for_node={oscillator} />
  </div>
</Panel>
