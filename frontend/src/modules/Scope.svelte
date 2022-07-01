<style>

  .screen {
    position: relative;
    padding-bottom: 75%;
    margin: 0 -0.5rem;
  }
  .controls {
    display: flex;
    flex-direction: row;
    padding-top: 0.5rem;
    max-width: 6rem;
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

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }
</script>

<script lang="ts">
  import { Scope } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte';

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

  let name = 'scope'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let state = get_sub_state(name, { threshold: 0.0, time: 1.0 })

  const scope = new Scope(context, { rate: 30 })

  let in_buffer: [number, number][] = []
  // Subscribe to step change
  void scope.subscribe('RenderFrame', raf_debounce((vec) => { in_buffer = vec }))

  const loading = scope.get_address()

  onDestroy(() => {
    void scope.dispose()
  })

  function draw_background(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = get_css_var('--module-background')
    ctx.fillRect(0, 0, width, height)

    ctx.lineWidth = 1;
    ctx.strokeStyle = get_css_var('--module-highlight');
    new Array(5).fill(0).forEach((_, index) => {
      ctx.beginPath()
      ctx.moveTo(0, (index * (height - 2) / 4) + 1)
      ctx.lineTo(width, (index * (height - 2) / 4) + 1)
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
        ctx.moveTo(x * width, (y * height) - 1.0)
      } else {
        ctx.lineTo(x * width, (y * height) - 1.0)
      }
    })

    data.slice().reverse().forEach(([, min], i) => {
      let x = (data.length - (i + 1)) / (data.length - 1)
      let y = min * -0.5 + 0.5
      ctx.lineTo(x * width, (y * height) + 1.0)
    })

    ctx.closePath()
    ctx.fillStyle = get_css_var('--foreground')
    ctx.strokeStyle = get_css_var('--foreground')
    ctx.lineWidth = 2;
    ctx.fill()
    ctx.stroke()
  }

  $: {
    if (canvas) {
      const width = canvas.width
      const height = canvas.height
      const context = canvas.getContext('2d')!

      draw_background(context, width, height)
      draw_wave(context, in_buffer, width, height)
    } 
  }

  // Update the sobaka node when the state changes
  $: void scope.message({ SetThreshold: state.threshold })
  $: void scope.message({ SetTime: state.time })

  // // Update the global state when state changes
  $: update_sub_state(name, state)
</script>

<Panel {name} height={15} width={13} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div>
      <div class="screen">
        <div class="oscilloscope-wrapper">
          <canvas class="canvas" bind:this={canvas} />
        </div>
      </div>
      <div class="controls">
        <Knob bind:value={state.threshold} range={[-1, 1]} />
        <Knob bind:value={state.time} range={[0, 12]} />
      </div>
    </div>
  {/await}
  <div slot="inputs">
    <Plug id={0} label="Input" type={PlugType.Input} for_module={scope} />
  </div>
</Panel>
