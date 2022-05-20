<script lang="ts">
  import { AbstractModule, Parameter } from 'sobaka-sample-audio-worklet'
  import type { NodeType } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Knob from '../../components/Knob.svelte'
  import { get_module_context } from '../ModuleWrapper.svelte'
  import Plug from './Plug.svelte'
  import { PlugType } from '../../state/plug';

  const { context, get_sub_state, update_sub_state } = get_module_context()

  export let for_node: AbstractModule<NodeType>
  export let for_input: number
  export let step: number | undefined = undefined

  // Initial default values configured by the module
  export let default_value = 0.0
  export let default_range: [number, number] = [0, 20000]

  // // Set values from the global state if they're present
  // let { value, range } = get_sub_state<Parameter['state']>(name) || {
  //   value: default_value,
  //   range: default_range
  // }

  let { value, range } = {
    value: 0,
    range: [-10, 10]
  }

  // Create and link sobaka node
  const parameter = new Parameter(context, { min: range[0], max: range[1], default: value })

  context.link(parameter, 0, for_node, for_input)

  // // Update the sobaka node when the state changes
  // $: void parameter.update({ value, range })

  // // Update the global state when state changes
  // $: update_sub_state(name, { value, range })

  const loading = parameter.get_address()

  onDestroy(() => {
    void parameter.dispose()
  })
</script>

<Knob {step} bind:value bind:range>
  <div slot="inputs">
    {#await loading then}
      <Plug label="Input" id={0} for_module={parameter} type={PlugType.Input} />
    {/await}
  </div>
</Knob>
