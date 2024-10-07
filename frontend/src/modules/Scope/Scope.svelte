<script context="module" lang="ts">
  import { ModuleTheme } from '../../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = {
    threshold: number
    time: number
    trigger: boolean
  }

  export const initialState: State = {
    threshold: 0.5,
    time: 0,
    trigger: false
  }
</script>

<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import { into_style } from '../../components/Theme.svelte'
  import { PlugType } from '../../context/plugs'
  import { onDestroy, onMount } from 'svelte'
  import { get_context as get_audio_context } from '../../audio'
  import Layout from '../../components/Layout.svelte'
  import RingSpinner from '../../components/RingSpinner.svelte'
  import { PointBufferData, ScopeController } from 'sobaka-dsp'
  import {
    createScaleRange,
    createTimeRange
  } from '../../components/Knob/range/rangeCreators'
  import ScopeChannel from './ScopeChannel.svelte'
  import Tooltip from '../../components/Tooltip.svelte'
  import Input from '../../components/Knob/Input.svelte'

  export let state: State
  let name = 'scope'
  let scope: ScopeController
  let node: AudioNode
  let loading = true

  let frame: PointBufferData = []
  let next_frame: number

  const context = get_audio_context()

  const update_frame = () => {
    frame = scope.frame() || frame
    next_frame = requestAnimationFrame(update_frame)
  }

  onMount(async () => {
    const { ScopeController } = await import('sobaka-dsp')
    scope = await ScopeController.create($context)
    node = scope.node()

    requestAnimationFrame(update_frame)

    loading = false
  })

  $: threshold = state.threshold
  $: scope?.command({ SetThreshold: threshold })

  $: time = state.time
  $: scope?.command({ SetScale: time })

  const threshold_range = createScaleRange(-1, 1)
  const time_range = createTimeRange(0, 0.5)

  onDestroy(() => {
    cancelAnimationFrame(next_frame)
    scope?.destroy()
    scope?.free()
  })
</script>

<Panel {name} height={15} width={13} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <div class="scope-controls">
      <div class="screen">
        {#each frame as channel, i (i)}
          {#if channel.length > 0}
            <ScopeChannel data={channel} />
          {/if}
        {/each}
      </div>
      <div class="controls">
        <div class="input">
          <Tooltip label="threshold" position="left">
            <Input bind:value={state.threshold} range={threshold_range} />
          </Tooltip>
        </div>
        <div class="input">
          <Tooltip label="time">
            <Input bind:value={state.time} range={time_range} />
          </Tooltip>
        </div>
      </div>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      label="signal_1"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      label="signal_2"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 1 }}
    />
    <Plug
      id={2}
      label="signal_3"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 2 }}
    />
    <Plug
      id={3}
      label="signal_4"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 3 }}
    />
  </div>
</Panel>

<style>
  .screen {
    position: relative;
    overflow: hidden;
    background-color: var(--module-knob-background);
    box-shadow: inset 0 0 0.25rem var(--background);
    border-radius: 5px;
    flex: 1 1 auto;

    display: flex;
    flex-direction: column;
  }

  .scope-controls {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .controls {
    display: flex;
    flex-direction: row;
    padding-top: 0.5rem;
  }
</style>
