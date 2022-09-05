<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = Readonly<{ min: number; max: number; value: number }>

  export const initialState: State = {
    min: 0,
    max: 10,
    value: 0.5
  }
</script>

<script lang="ts">
  import type { Parameter } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Plug from './shared/Plug.svelte'
  import Panel from './shared/Panel.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'

  const context = get_audio_context()

  export let state: SubStore<State>
  let name = 'parameter'
  let parameter: Parameter
  let loading = true

  onMount(async () => {
    const { Parameter } = await import('sobaka-sample-audio-worklet')
    parameter = new Parameter($context, {
      min: $state.min,
      max: $state.max,
      default: $state.value
    })
    await parameter.get_address()
    loading = false
  })

  const value = state.select(s => s.value)
  const min = state.select(s => s.min)
  const max = state.select(s => s.max)

  // Update the sobaka node when the state changes
  $: void parameter?.message({ SetParameter: $value })

  onDestroy(() => {
    void parameter?.dispose()
  })
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <span>
      <Knob bind:value={$value} range={[$min, $max]} label="value" />
    </span>
  {/await}
  <div slot="outputs">
    <Plug id={0} label="output" type={PlugType.Output} for_module={parameter} />
  </div>
</Panel>
