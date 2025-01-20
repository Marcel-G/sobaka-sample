<script context="module" lang="ts">
  import type { ModuleTheme } from './ThemeProvider.svelte'
  export const theme: Partial<ModuleTheme> = {
    primary: 'var(--purple)'
  }

  type State = { time: number }

  export const initialState: State = { time: 2 }
</script>

<script lang="ts">
  import type { Delay } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { create_time_range } from '../range/range_creators'
  import { getGlobalCtx } from '../context/global'
  import { PlugType } from '../models/workspace'

  export let state: State
  export let disabled = false
  let name = 'delay'
  let delay: Delay
  let node: AudioNode
  let delay_time_param: AudioParam
  let loading = true

  const context = getGlobalCtx()

  onMount(async () => {
    const { Delay } = await import('sobaka-dsp')
    delay = await Delay.create(context.audio)
    node = delay.node()
    delay_time_param = delay.get_param('DelayTime')
    loading = false
  })

  // Update the sobaka node when the state changes
  $: time = state.time
  $: delay_time_param?.setValueAtTime(time, context.audio.currentTime)

  const delay_range = create_time_range(0, 10)

  onDestroy(() => {
    delay?.destroy()
    delay?.free()
  })
</script>

<Panel {name} height={6} width={7} {disabled} {theme}>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <div class="controls">
      <Knob {disabled} bind:value={state.time} range={delay_range} label="seconds">
        <div slot="knob-inputs">
          <Plug
            id={0}
            {disabled}
            label="seconds_cv"
            ctx={{ type: PlugType.Param, param: delay_time_param }}
          />
        </div>
      </Knob>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
    <Plug
      id={1}
      {disabled}
      label="reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>
