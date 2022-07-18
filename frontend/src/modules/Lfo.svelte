<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>

<script lang="ts">
  import { Lfo } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import Knob from '../components/Knob.svelte'

  let name = 'lfo'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let state = get_sub_state(name, { bpm: 5 })

  const lfo = new Lfo(context, state)

  const loading = lfo.get_address()

  // Update the sobaka node when the state changes
  $: void lfo.message({ SetBPM: state.bpm })

  // Update the global state when state changes
  $: update_sub_state(name, state)

  onDestroy(() => {
    void lfo.dispose()
  })
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob bind:value={state.bpm} range={[0, 600]} label="bpm">
      <div slot="inputs">
        <Plug id={1} label="bpm_cv" type={PlugType.Input} for_module={lfo} />
      </div>
    </Knob>
  {/await}

  <div slot="inputs">
    <Plug id={0} label="reset" type={PlugType.Input} for_module={lfo} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="signal" type={PlugType.Output} for_module={lfo} />
  </div>
</Panel>