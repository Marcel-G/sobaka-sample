<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }
</script>

<script lang="ts">
  import { Float, Param, Reverb } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import Knob from '../components/Knob.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'reverb'

  let state = get_sub_state(name, { wet: 0, length: 0 })

  const reverb = new Reverb(context, state)

  // Update the sobaka node when the state changes
  $: void reverb.message({ SetWet: state.wet })
  $: void reverb.message({ SetDelay: state.length })

  // // Update the global state when state changes
  $: update_sub_state(name, state)

  const loading = reverb.get_address()

  onDestroy(() => {
    void reverb.dispose()
  })
</script>

<Panel name="reverb" height={6} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <Knob bind:value={state.wet} range={[0, 1]} />
      <Knob bind:value={state.length} range={[0, 10]} />
    </div>
  {/await}

  <div slot="inputs">
    <Plug id={0} label="l" type={PlugType.Input} for_module={reverb} />
    <Plug id={1} label="r" type={PlugType.Input} for_module={reverb} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="l" type={PlugType.Output} for_module={reverb} />
    <Plug id={1} label="r" type={PlugType.Output} for_module={reverb} />
  </div>
</Panel>
