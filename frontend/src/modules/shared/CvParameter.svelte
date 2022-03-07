<script lang="ts">
  import { AbstractNode, Parameter } from 'sobaka-sample-audio-worklet'
  import type { NodeType, AnyInput } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Knob from '../../components/Knob.svelte'
  import { get_module_context } from '../ModuleWrapper.svelte'
  import Plug from './Plug.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  export let for_node: AbstractNode<NodeType>
  export let for_input: NonNullable<AnyInput>
  export let name: string = for_input
  export let step: number | undefined = undefined

  // Initial default values configured by the module
  export let default_value = 0.0
  export let default_range: [number, number] = [0, 20000]

  // Set values from the global state if they're present
  let { value, range } = get_sub_state<Parameter['state']>(name) || {
    value: default_value,
    range: default_range
  }

  // Create and link sobaka node
  const parameter = new Parameter(context, { value, range })
  context.link(parameter, for_node, for_input)

  // Update the sobaka node when the state changes
  $: void parameter.update({ value, range })

  // Update the global state when state changes
  $: update_sub_state(name, { value, range })

  const loading = parameter.node_id

  onDestroy(() => {
    void parameter.dispose()
  })
</script>

<Knob {step} bind:value bind:range>
  <div slot="inputs">
    {#await loading then}
      <Plug name={`${name}_Cv`} for_node={parameter} for_input={'Cv'} />
    {/await}
  </div>
</Knob>
