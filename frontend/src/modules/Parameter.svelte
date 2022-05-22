<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }
</script>

<script lang="ts">
  import { Float, Param, Parameter } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'
  import Panel from './shared/Panel.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug';

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'parameter'

  // Set values from the global state if they're present
  let { min, max, value } = get_sub_state(name, { min: 0, max: 10, value: 0 })

  // Create and link sobaka node
  const parameter = new Parameter(context, { min, max, default: value })

  // Update the sobaka node when the state changes
  $: void parameter.message(Param(0), [Float(value)]);

  // // Update the global state when state changes
  $: update_sub_state(name, { min, max, value })

  const loading = parameter.get_address()

  onDestroy(() => {
    void parameter.dispose()
  })
</script>

<Panel name="parameter" height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <span>
      <Knob bind:value range={[min, max]} />
    </span>
  {/await}
  <div slot="outputs">
    <Plug
      id={0}
      label="Output"
      type={PlugType.Output}
      for_module={parameter}
    />
  </div>
</Panel>
