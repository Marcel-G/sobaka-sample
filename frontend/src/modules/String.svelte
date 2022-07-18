<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>

<script lang="ts">
  import { String } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import Knob from '../components/Knob.svelte'

  let name = 'string'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let state = get_sub_state(name, { damping: 0.5, decay: 0.5 })

  const string = new String(context, {
    damping: state.damping,
    gain_per_second: state.decay
  })

  const loading = string.get_address()

  // Update the sobaka node when the state changes
  $: void string.message({ SetGainPerSecond: state.decay })
  $: void string.message({ SetDamping: state.damping })

  // // Update the global state when state changes
  $: update_sub_state(name, state)

  onDestroy(() => {
    void string.dispose()
  })
</script>

<Panel {name} height={9} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob bind:value={state.damping} range={[0, 1]} label="damping" />
    <Knob bind:value={state.decay} range={[0, 1]} label="decay" />
  {/await}
  <div slot="inputs">
    <Plug id={0} label="excitation" type={PlugType.Input} for_module={string} />
    <Plug id={1} label="pitch" type={PlugType.Input} for_module={string} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="output" type={PlugType.Output} for_module={string} />
  </div>
</Panel>
