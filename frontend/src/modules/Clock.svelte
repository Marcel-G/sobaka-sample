<script lang="ts">
  import { Clock, Input, Parameter, SamplerNode } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import type { Writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'
  interface State {
    frequency: { range: [number, number]; value: number }
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SamplerNode
  export let initial_state: State = {
    frequency: { range: [0, 200], value: 0 }
  }

  const clock = new Clock(context)
  const frequency_param = new Parameter(context)

  let output_node: Writable<Element>

  const loading = Promise.all([
    clock.create(),
    frequency_param.create(initial_state.frequency)
  ]).then(async ([clock_id, frequency_id]) => {
    modules.register(id, {
      module_id: clock_id,
      output_node: output_node,
      input_nodes: {}
    })

    await context.client.request({
      // @todo move to binding lib
      method: 'module/connect',
      params: [frequency_id, clock_id, { Clock: Input.Frequency }]
    })
  })

  const frequency = as_writable(frequency_param, initial_state.frequency)

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
    <Plug {id} label="output" bind:el={output_node} />
  </div>
</Panel>
