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
  import { onMount } from 'svelte'
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
  let parameter: ConstantSourceNode
  let loading = true

  onMount(async () => {
    parameter = new ConstantSourceNode($context)
    parameter.start()
    loading = false
  })

  const value = state.select(s => s.value)
  const min = state.select(s => s.min)
  const max = state.select(s => s.max)

  // Update the sobaka node when the state changes
  $: parameter?.offset.setValueAtTime($value, $context.currentTime)
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
    <Plug
      id={0}
      label="output"
      ctx={{ type: PlugType.Output, connectIndex: 0, module: parameter }}
    />
  </div>
</Panel>
