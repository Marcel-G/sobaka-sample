<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
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
  import type { Scope } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Button from '../components/Button.svelte'
  import { get_context as get_audio_context } from '../audio'
  import { SubStore } from '../utils/patches'

  export let state: SubStore<State>
  let name = 'scope'
  let scope: Scope
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Scope } = await import('sobaka-sample-audio-worklet')
    scope = new Scope($context, { rate: 30 })
    await scope.get_address()
    loading = false

    void scope.subscribe(
      'RenderFrame',
      raf_debounce(vec => {
        in_buffer = vec
      })
    )
  })

  let canvas: HTMLCanvasElement

  function get_css_var(name: string): string {
    return getComputedStyle(canvas).getPropertyValue(name)
  }

  function raf_debounce<T>(fn: (arg: T) => void): (arg: T) => void {
    let frame: number | null = null
    return (arg: T) => {
      if (frame) {
        cancelAnimationFrame(frame)
      }
      frame = requestAnimationFrame(() => {
        fn(arg)
      })
    }
  }

  let in_buffer: [number, number][] = []
  // Subscribe to step change

  onDestroy(() => {
    void scope?.dispose()
  })

  function draw_background(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = get_css_var('--module-background')
    ctx.fillRect(0, 0, width, height)

    ctx.lineWidth = 1
    ctx.strokeStyle = get_css_var('--module-highlight')
    new Array(5).fill(0).forEach((_, index) => {
      ctx.beginPath()
      ctx.moveTo(0, (index * (height - 2)) / 4 + 1)
      ctx.lineTo(width, (index * (height - 2)) / 4 + 1)
      ctx.stroke()
    })
  }

  function draw_wave(
    ctx: CanvasRenderingContext2D,
    data: [number, number][],
    width: number,
    height: number
  ) {
    ctx.beginPath()
    data.forEach(([max], i) => {
      let x = i / (data.length - 1)
      let y = max * -0.5 + 0.5
      if (i == 0) {
        ctx.moveTo(x * width, y * height - 1.0)
      } else {
        ctx.lineTo(x * width, y * height - 1.0)
      }
    })

    data
      .slice()
      .reverse()
      .forEach(([, min], i) => {
        let x = (data.length - (i + 1)) / (data.length - 1)
        let y = min * -0.5 + 0.5
        ctx.lineTo(x * width, y * height + 1.0)
      })

    ctx.closePath()
    ctx.fillStyle = get_css_var('--foreground')
    ctx.strokeStyle = get_css_var('--foreground')
    ctx.lineWidth = 1
    ctx.fill()
    ctx.stroke()
  }

  $: {
    if (canvas) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const context = canvas.getContext('2d')!

      draw_background(context, width, height)
      draw_wave(context, in_buffer, width, height)
    }
  }

  function handle_toggle() {
    state.update((s: Draft<State>) => {
      s.trigger = !s.trigger
      return s
    })
  }

  const threshold = state.select(s => s.threshold)
  const time = state.select(s => s.time)
  const trigger = state.select(s => s.trigger)

  // Update the sobaka node when the state changes
  $: void scope?.message({ SetThreshold: $threshold })
  $: void scope?.message({ SetTime: $time })
  $: void scope?.message({ SetTriggerEnabled: $trigger })
</script>

<Panel {name} height={15} width={13} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <div>
      <div class="screen">
        <div class="oscilloscope-wrapper">
          <canvas class="canvas" bind:this={canvas} />
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
    <Plug id={0} label="signal" type={PlugType.Input} for_module={scope} />
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
