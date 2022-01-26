<script lang="ts">
  import { Parameter, SobakaContext } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'

  interface State {
    parameter: Parameter['state']
  }

  export let initial_state: State = {
    parameter: { range: [0, 1], value: 0.0 }
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext

  const state = writable(initial_state.parameter)

  const parameter = new Parameter(context, initial_state.parameter)

  $: {
    void parameter.update($state)
    modules.update(id, { parameter: $state })
  }

  const loading = parameter.node_id

  onDestroy(() => {
    void parameter.dispose()
  })
</script>

<Panel name="parameter" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <span>
      <Knob bind:value={$state.value} bind:range={$state.range} />
    </span>
  {/await}
  <div slot="outputs">
    <Plug {id} name="output" for_module={parameter} />
  </div>
</Panel>
