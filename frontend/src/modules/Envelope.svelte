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
    highlight: 'var(--yellow)',
    background: 'var(--yellow-dark)'
  }
</script>

<script lang="ts">
  import { Envelope, Float, Param } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import Knob from '../components/Knob.svelte'

  let name = 'envelope'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let { attack, release } = get_sub_state(name, { attack: 0.125, release: 0.5 })

  const envelope = new Envelope(context, { attack, release })

  // Update the sobaka node when the state changes
  $: void envelope.message({ SetAttack: attack })
  $: void envelope.message({ SetRelease: release })

  // Update the global state when state changes
  $: update_sub_state(name, { attack, release })

  const loading = envelope.get_address()

  onDestroy(() => {
    void envelope.dispose()
  })
</script>

<Panel {name} height={6} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <Knob bind:value={attack} range={[0, 1]} />
      <Knob bind:value={release} range={[0, 1]} />
    </div>
  {/await}
  <div slot="inputs">
    <Plug id={0} label="Trigger" type={PlugType.Input} for_module={envelope} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="Envelope" type={PlugType.Output} for_module={envelope} />
  </div>
</Panel>
