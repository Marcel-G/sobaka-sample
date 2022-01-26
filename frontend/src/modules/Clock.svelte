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
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    frequency: { range: [0, 4], value: 1 }
  }

  const clock = new Oscillator(context, { wave: Oscillator.Wave.Square })
  const frequency_param = new Parameter(context, initial_state.frequency)

  const loading = clock.node_id

  context.link(frequency_param, clock, Oscillator.Input.Frequency)

  const frequency = writable(initial_state.frequency)

  $: {
    void frequency_param.update($frequency)
    modules.update(id, {
      frequency: $frequency
    })
  }

  onDestroy(() => {
    void clock.dispose()
  })
</script>

<Panel name="clock" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob bind:value={$frequency.value} bind:range={$frequency.range} />
  {/await}

  <div slot="outputs">
    <Plug {id} for_module={clock} name="output" />
  </div>
</Panel>
