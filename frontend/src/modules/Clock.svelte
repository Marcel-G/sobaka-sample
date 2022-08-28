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
  import type { Clock } from 'sobaka-sample-audio-worklet'
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
  let clock: Clock
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Clock } = await import('sobaka-sample-audio-worklet')
    clock = new Clock($context, $state)
    await clock.get_address()
    loading = false
  })

  const bpm = state.select(s => s.bpm)

  // Update the sobaka node when the state changes
  $: void clock?.message({ SetBPM: $bpm })

  onDestroy(() => {
    void clock?.dispose()
  })
</script>

<Panel {name} height={7} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <Knob bind:value={$bpm} range={[0, 240]} label="bpm">
      <div slot="inputs">
        <Plug id={0} label="bpm_cv" type={PlugType.Input} for_module={clock} />
      </div>
    </Knob>
  {/if}

  <div slot="outputs">
    <Plug id={0} label="1/1" type={PlugType.Output} for_module={clock} />
    <Plug id={1} label="1/2" type={PlugType.Output} for_module={clock} />
    <Plug id={2} label="1/4" type={PlugType.Output} for_module={clock} />
    <Plug id={3} label="1/8" type={PlugType.Output} for_module={clock} />
    <Plug id={4} label="1/16" type={PlugType.Output} for_module={clock} />
  </div>
</Panel>
