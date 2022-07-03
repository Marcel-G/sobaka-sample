<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>

<script lang="ts">
  import { Oscillator } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug';
  import Knob from '../components/Knob.svelte';

  let name = 'oscillator'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let state = get_sub_state(name, { sine: 0.25, saw: 0.25, square: 0.25, triangle: 0.25, pitch: 0.0 })

  const oscillator = new Oscillator(context, state)

  const loading = oscillator.get_address()

  // Update the sobaka node when the state changes
  $: void oscillator.message({ SetPitch: state.pitch });
  $: void oscillator.message({ SetSawLevel: state.saw });
  $: void oscillator.message({ SetSineLevel: state.sine });
  $: void oscillator.message({ SetSquareLevel: state.square });
  $: void oscillator.message({ SetTriangleLevel: state.triangle });

  // Update the global state when state changes
  $: update_sub_state(name, state)

  onDestroy(() => {
    void oscillator.dispose()
  })
</script>

<Panel {name} height={18} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
      <Knob bind:value={state.pitch} range={[0, 4]}>
      <div slot="inputs">
        <Plug
          id={0}
          label="Frequency Cv"
          type={PlugType.Input}
          for_module={oscillator}
        />
      </div>
      </Knob>
      <Knob bind:value={state.saw} range={[0, 1]} />
      <Knob bind:value={state.sine} range={[0, 1]} />
      <Knob bind:value={state.square} range={[0, 1]} />
      <Knob bind:value={state.triangle} range={[0, 1]} />
  {/await}
  <div slot="outputs">
    <Plug
      id={0}
      label="Output"
      type={PlugType.Output}
      for_module={oscillator}
    />
  </div>
</Panel>
