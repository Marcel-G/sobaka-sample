<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)'
  }
</script>

<script lang="ts">
  import { Parameter } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'
  import Panel from './shared/Panel.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'parameter'

  // Set values from the global state if they're present
  let { value, range } = get_sub_state<Parameter['state']>(name) || {
    value: 0,
    range: [-10, 10]
  }

  // Create and link sobaka node
  const parameter = new Parameter(context, { value, range })

  // Update the sobaka node when the state changes
  $: void parameter.update({ value, range })

  // Update the global state when state changes
  $: update_sub_state(name, { value, range })

  const loading = parameter.node_id

  onDestroy(() => {
    void parameter.dispose()
  })
</script>

<Panel name="parameter" height={3} width={3} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <span>
      <Knob bind:value bind:range />
    </span>
  {/await}
  <div slot="outputs">
    <Plug name="output" for_node={parameter} />
  </div>
</Panel>
