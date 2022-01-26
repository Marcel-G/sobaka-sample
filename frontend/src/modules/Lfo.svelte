<script lang="ts">
  import { Oscillator, Parameter, SobakaContext } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'

  interface State {
    frequency: Parameter['state']
    oscillator: Oscillator['state']
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    frequency: { range: [0, 10], value: 1 },
    oscillator: { wave: Oscillator.Wave.Sine }
  }

  const oscillator = new Oscillator(context, initial_state.oscillator)
  const frequency_param = new Parameter(context, initial_state.frequency)

  const loading = oscillator.node_id

  context.link(frequency_param, oscillator, Oscillator.Input.Frequency)

  const frequency = writable(initial_state.frequency)
  const oscillator_state = writable(initial_state.oscillator)

  $: {
    void frequency_param.update($frequency)
    void oscillator.update($oscillator_state)

    modules.update(id, {
      frequency: $frequency,
      oscillator: $oscillator_state
    })
  }

  onDestroy(() => {
    void oscillator.dispose()
  })
</script>

<Panel name="lfo" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob bind:value={$frequency.value} bind:range={$frequency.range} />
  {/await}
  <div slot="outputs">
    <Plug {id} name="output" for_module={oscillator} />
  </div>
</Panel>
