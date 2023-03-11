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
  import type { Delay } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Knob from '../components/Knob.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'

  export let state: State
  let name = 'delay'
  let delay: Delay
  let node: AudioNode
  let delay_time_param: AudioParam
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Delay } = await import('sobaka-dsp')
    delay = await Delay.create($context)
    node = delay.node()
    delay_time_param = delay.get_param('DelayTime')
    loading = false
  })

  const time = state.select(s => s.time)

  // Update the sobaka node when the state changes
  $: delay_time_param?.setValueAtTime($time, $context.currentTime)

  onDestroy(() => {
    delay?.destroy()
    delay?.free()
  })
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="controls">
      <Knob bind:value={$time} range={[0, 10]} label="seconds">
        <div slot="inputs">
          <Plug
            id={0}
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
      label="signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
    <Plug
      id={1}
      label="reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      label="output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>
