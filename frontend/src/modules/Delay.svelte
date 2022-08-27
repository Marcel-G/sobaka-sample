<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }

  type State = Readonly<{ time: number }>

  export const initialState: State = { time: 2 }
</script>

<script lang="ts">
  import type { Delay } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Knob from '../components/Knob.svelte'
  import { PlugType } from '../workspace/plugs'
  import { SubStore } from '../utils/patches'
  import { get_audio_context } from '../routes/workspace/[slug]/+layout.svelte'

  export let state: SubStore<State>
  let name = 'delay'
  let delay: Delay
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Delay } = await import('sobaka-sample-audio-worklet')
    delay = new Delay($context, $state)
    await delay.get_address()
    loading = false
  })

  const time = state.select(s => s.time)

  // Update the sobaka node when the state changes
  $: void delay?.message({ SetDelay: $time })

  onDestroy(() => {
    void delay?.dispose()
  })
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="controls">
      <Knob bind:value={$time} range={[0, 10]} label="seconds">
        <div slot="inputs">
          <Plug id={2} label="seconds_cv" type={PlugType.Input} for_module={delay} />
        </div>
      </Knob>
    </div>
  {/if}
  <div slot="inputs">
    <Plug id={1} label="signal" type={PlugType.Input} for_module={delay} />
    <Plug id={0} label="reset" type={PlugType.Input} for_module={delay} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="output" type={PlugType.Output} for_module={delay} />
  </div>
</Panel>
