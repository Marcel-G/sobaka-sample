<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>

<script lang="ts">
  import { Clock } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import Knob from '../components/Knob.svelte'

  let name = 'clock'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let state = get_sub_state(name, { bpm: 120 })

  const clock = new Clock(context, state)

  const loading = clock.get_address()

  // Update the sobaka node when the state changes
  $: void clock.message({ SetBPM: state.bpm })

  // Update the global state when state changes
  $: update_sub_state(name, state)

  onDestroy(() => {
    void clock.dispose()
  })
</script>

<Panel {name} height={7} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob bind:value={state.bpm} range={[0, 240]} label="bpm">
      <div slot="inputs">
        <Plug id={0} label="bpm_cv" type={PlugType.Input} for_module={clock} />
      </div>
    </Knob>
  {/await}

  <div slot="outputs">
    <Plug id={0} label="1/1" type={PlugType.Output} for_module={clock} />
    <Plug id={1} label="1/2" type={PlugType.Output} for_module={clock} />
    <Plug id={2} label="1/4" type={PlugType.Output} for_module={clock} />
    <Plug id={3} label="1/8" type={PlugType.Output} for_module={clock} />
    <Plug id={4} label="1/16" type={PlugType.Output} for_module={clock} />
  </div>
</Panel>
