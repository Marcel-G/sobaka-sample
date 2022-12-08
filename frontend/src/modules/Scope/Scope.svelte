<script context="module" lang="ts">
  import { ModuleTheme } from '../../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = Readonly<{
    threshold: number
    time: number
    trigger: boolean
  }>

  export const initialState: State = {
    threshold: 0.5,
    time: 0,
    trigger: false
  }
</script>

<script lang="ts">
  import { Draft } from 'immer'
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import { into_style } from '../../components/Theme.svelte'
  import { PlugType } from '../../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import Knob from '../../components/Knob.svelte'
  import Button from '../../components/Button.svelte'
  import { get_context as get_audio_context } from '../../audio'
  import { SubStore } from '../../utils/patches'
  import { create_scope, Scope } from './render'

  export let state: SubStore<State>
  let name = 'scope'
  let scope: Scope
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    // Needs to be AnalyzerNode
    scope = create_scope($context)

    scope.start()

    loading = false
  })

  function handle_toggle() {
    state.update((s: Draft<State>) => {
      s.trigger = !s.trigger
      return s
    })
  }

  $: canvas = scope?.canvas

  const threshold = state.select(s => s.threshold)
  const time = state.select(s => s.time)
  const trigger = state.select(s => s.trigger)

  $: scope?.threshold.set($threshold)
  $: scope?.time.set($time)
  $: scope?.trigger.set($trigger)

  onDestroy(() => {
    scope?.stop()
  })
</script>

<Panel {name} height={15} width={13} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div>
      <div class="screen">
        <div class="oscilloscope-wrapper">
          <canvas class="canvas" bind:this={$canvas} />
        </div>
      </div>
      <div class="controls">
        <Knob bind:value={$threshold} range={[-1, 1]} label="threshold" />
        <Knob bind:value={$time} range={[0, 12]} label="time" />
        <Button bind:pressed={$trigger} onClick={handle_toggle} />
      </div>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      label="signal"
      ctx={{ type: PlugType.Input, module: scope?.node, connectIndex: 0 }}
    />
  </div>
</Panel>

<style>
  .screen {
    position: relative;
    padding-bottom: 75%;
    margin: 0 -0.5rem;
  }
  .controls {
    display: flex;
    flex-direction: row;
    padding: 0.5rem;
  }
  .oscilloscope-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .canvas {
    width: 100%;
    height: 100%;
  }
</style>
