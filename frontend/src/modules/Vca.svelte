<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }
</script>

<script lang="ts">
  import { Float, Param, Vca } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Knob from '../components/Knob.svelte'
  import { PlugType } from '../state/plug';

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'parameter'

  // Set values from the global state if they're present
  let { value } = get_sub_state(name, { value: 0 })

  // Create and link sobaka node
  const vca = new Vca(context, { value })

  // Update the sobaka node when the state changes
  $: void vca.message(Param(0), [Float(value)])

  // // Update the global state when state changes
  $: update_sub_state(name, { value })

  const loading = vca.get_address()

  onDestroy(() => {
    void vca.dispose()
  })
</script>

<Panel name="vca" height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <span>
      <Knob bind:value range={[-1, 1]} />
    </span>
  {/await}

  <div slot="inputs">
    <Plug id={0} label="Signal" type={PlugType.Input} for_module={vca} />
    <Plug id={1} label="Cv" type={PlugType.Input} for_module={vca} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={vca} />
  </div>
</Panel>
