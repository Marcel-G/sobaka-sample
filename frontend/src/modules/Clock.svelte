<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = { bpm: number }

  export const initialState: State = { bpm: 120 }
</script>

<script lang="ts">
  import type { ClockNode } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import Knob from '../components/Knob.svelte'
  import { get_context as get_audio_context } from '../audio'
  import { SubStore } from '../utils/patches'

  export let state: SubStore<State>
  let name = 'clock'
  let clock: ClockNode
  let node: AudioNode
  let bpm_param: AudioParam
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { ClockNode } = await import('sobaka-sample-audio-worklet')
    clock = await ClockNode.install($context)
    node = clock.node()
    bpm_param = clock.get_param('Bpm')
    loading = false
  })

  const bpm = state.select(s => s.bpm)

  $: bpm_param?.setValueAtTime($bpm || 0, 0);

  onDestroy(() => {
    clock?.destroy()
    clock?.free()
  })
</script>

<Panel {name} height={7} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <Knob bind:value={$bpm} range={[0, 240]} label="bpm">
      <div slot="inputs">
        <Plug label="bpm_cv" type={PlugType.Param} for_module={bpm_param} />
      </div>
    </Knob>
  {/if}

  <div slot="outputs">
    <Plug id={0} label="1/1" type={PlugType.Output} for_module={node} />
    <Plug id={1} label="1/2" type={PlugType.Output} for_module={node} />
    <Plug id={2} label="1/4" type={PlugType.Output} for_module={node} />
    <Plug id={3} label="1/8" type={PlugType.Output} for_module={node} />
    <Plug id={4} label="1/16" type={PlugType.Output} for_module={node} />
  </div>
</Panel>
