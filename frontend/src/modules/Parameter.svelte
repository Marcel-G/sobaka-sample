<script lang="ts">
  import { Parameter, SamplerNode } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import type { Writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'

  interface State {
    parameter: { range: [number, number]; value: number }
  }

  export let label: string
  export let initial_state: State = {
    parameter: { range: [0, 1], value: 0.0 }
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SamplerNode

  let output_node: Writable<Element>

  const parameter = new Parameter(context)
  const loading = parameter.create(initial_state.parameter)

  void loading.then(module_id =>
    modules.register(id, {
      module_id: module_id,
      output_node: output_node,
      input_nodes: {}
    })
  )

  let state = as_writable(parameter, initial_state.parameter)

  $: modules.update(id, {
    parameter: $state
  })

  onDestroy(() => {
    void parameter.dispose()
  })
</script>

<Panel name="parameter" {id} {position} height={3} width={3}>
  {#if $state}
    <span>
      <Knob label="Frequency" bind:value={$state.value} bind:range={$state.range} />
    </span>
  {:else}
    <p>Loading...</p>
  {/if}
  <div slot="outputs">
    <Plug {id} label="output" bind:el={output_node} />
  </div>
</Panel>
