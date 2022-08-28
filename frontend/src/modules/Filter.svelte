<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }

  type State = Readonly<{
    frequency: number
    q: number
  }>

  export const initialState: State = {
    frequency: 0.1,
    q: 0.1
  }
</script>

<script lang="ts">
  import type { Filter } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'

  export let state: SubStore<State>
  let name = 'filter'
  let filter: Filter
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Filter } = await import('sobaka-sample-audio-worklet')
    filter = new Filter($context, $state)
    await filter.get_address()
    loading = false
  })

  const frequency = state.select(s => s.frequency)
  const q = state.select(s => s.q)

  // Update the sobaka node when the state changes
  $: void filter?.message({ SetFrequency: $state.frequency })
  $: void filter?.message({ SetQ: $state.q })

  onDestroy(() => {
    void filter?.dispose()
  })
</script>

<Panel {name} height={6} width={8} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="controls">
      <Knob bind:value={$frequency} range={[0, 8]} label="cutoff">
        <div slot="inputs">
          <Plug id={1} label="cutoff_cv" type={PlugType.Input} for_module={filter} />
        </div>
      </Knob>
      <Knob bind:value={$q} range={[0, 1]} label="q">
        <div slot="inputs">
          <Plug id={2} label="q_cv" type={PlugType.Input} for_module={filter} />
        </div>
      </Knob>
    </div>
  {/if}
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

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>
