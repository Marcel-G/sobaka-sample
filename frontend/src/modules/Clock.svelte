<script lang="ts">
  import { Clock, Parameter, SobakaContext } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'
  interface State {
    frequency: Parameter['state']
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    frequency: { range: [0, 200], value: 0 }
  }

  const clock = new Clock(context)
  const frequency_param = new Parameter(context, initial_state.frequency)

  const loading = clock.module_id

  context.link(frequency_param, clock, Clock.Input.Frequency)

  const frequency = as_writable(frequency_param)

  $: modules.update(id, {
    frequency: $frequency
  })

  onDestroy(() => {
    void clock.dispose()
  })
</script>

<Panel name="clock" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob label="Frequency" bind:value={$frequency.value} bind:range={$frequency.range} />
  {/await}

  <div slot="outputs">
    <Plug {id} for_module={clock} name="output" />
  </div>
</Panel>
