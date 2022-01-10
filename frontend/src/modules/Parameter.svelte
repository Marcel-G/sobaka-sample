<script lang="ts">
  import { Parameter, SobakaContext } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'

  interface State {
    parameter: Parameter['state']
  }

  export let label: string
  export let initial_state: State = {
    parameter: { range: [0, 1], value: 0.0 }
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext

  const parameter = new Parameter(context, initial_state.parameter)

  const loading = parameter.module_id

  modules.register(id, parameter)

  const state = as_writable(parameter)

  $: modules.update(id, {
    parameter: $state
  })

  onDestroy(() => {
    void parameter.dispose()
  })
</script>

<Panel name="parameter" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <span>
      <Knob label="Frequency" bind:value={$state.value} bind:range={$state.range} />
    </span>
  {/await}
  <div slot="outputs">
    <Plug {id} label="output" />
  </div>
</Panel>
