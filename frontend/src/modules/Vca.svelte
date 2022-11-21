<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }

  type State = Readonly<{ value: number }>

  export const initialState: State = {
    value: 0.5
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Knob from '../components/Knob.svelte'
  import { PlugType } from '../workspace/plugs'
  import { SubStore } from '../utils/patches'
  import { get_context as get_audio_context } from '../audio'

  export let state: SubStore<State>
  let name = 'vca'
  let vca: GainNode
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    vca = new GainNode($context)
    loading = false
  })

  const value = state.select(s => s.value)

  // Update the sobaka node when the state changes
  // $: void vca?.message({ SetLevel: $value })
  $: if (vca && $value) {
    vca.gain.setValueAtTime($value, 0);
  };
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <span>
      <Knob bind:value={$value} range={[-1, 1]} label="attenuverter" />
    </span>
  {/if}

  <div slot="inputs">
    <Plug id={0} label="Signal" type={PlugType.Input} for_module={vca} />
    <!-- @todo -- id not needed for params -->
    <Plug id={0} label="Cv" type={PlugType.Param} for_module={vca?.gain} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={vca} />
  </div>
</Panel>
