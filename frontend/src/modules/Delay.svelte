<script lang="ts">
  import { SobakaContext, Delay, Parameter } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'

  interface State {
    time: Parameter['state']
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    time: { range: [0, 10], value: 0.5 }
  }

  const delay = new Delay(context)
  const time_param = new Parameter(context, initial_state.time)

  const loading = delay.module_id

  context.link(time_param, delay, Delay.Input.Time)

  const time = as_writable(time_param)

  $: modules.update(id, {
    time: $time
  })

  onDestroy(() => {
    void delay.dispose()
  })
</script>

<Panel name="delay" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob label="Time" bind:value={$time.value} bind:range={$time.range} />
  {/await}

  <div slot="inputs">
    <Plug {id} name="signal" for_module={delay} for_input={Delay.Input.Signal} />
  </div>

  <div slot="outputs">
    <Plug {id} name="output" for_module={delay} />
  </div>
</Panel>
