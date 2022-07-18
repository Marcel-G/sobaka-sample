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
  import { Filter } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import Knob from '../components/Knob.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'filter'

  let { frequency, q, kind } = get_sub_state(name, {
    kind: 'Filter',
    frequency: 1.0,
    q: 0.25
  })

  const filter = new Filter(context, { frequency, q })

  // Update the sobaka node when the state changes
  $: void filter.message({ SetFrequency: frequency })
  $: void filter.message({ SetQ: q })

  // Update the global state when state changes
  $: update_sub_state(name, { frequency, q, kind })

  const loading = filter.get_address()

  onDestroy(() => {
    void filter.dispose()
  })
</script>

<Panel name="filter" height={6} width={8} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <Knob bind:value={frequency} range={[0, 8]} label="cutoff">
        <div slot="inputs">
          <Plug id={1} label="cutoff_cv" type={PlugType.Input} for_module={filter} />
        </div>
      </Knob>
      <Knob bind:value={q} range={[0, 1]} label="q">
        <div slot="inputs">
          <Plug id={2} label="q_cv" type={PlugType.Input} for_module={filter} />
        </div>
      </Knob>
    </div>
  {/await}
  <div slot="inputs">
    <Plug id={0} label="signal" type={PlugType.Input} for_module={filter} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="lowpass" type={PlugType.Output} for_module={filter} />
    <Plug id={1} label="highpass" type={PlugType.Output} for_module={filter} />
    <Plug id={2} label="bandpass" type={PlugType.Output} for_module={filter} />
    <Plug id={3} label="moog" type={PlugType.Output} for_module={filter} />
  </div>
</Panel>
