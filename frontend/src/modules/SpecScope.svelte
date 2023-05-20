<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  type State = {}

  export const initialState: State = {}
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { onDestroy, onMount } from 'svelte'
  import { get_context as get_audio_context } from '../audio'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { clamp } from 'lodash'

  export let state: State
  let name = 'spec_scope'
  let node: AnalyserNode
  let loading = true

  let canvas: HTMLCanvasElement

  let spec: Float32Array

  let next_frame: number

  const context = get_audio_context()

  const get_css_var = (name: string): string => {
    return getComputedStyle(canvas).getPropertyValue(name)
  }

  /**
   * Converts frequency to canvas value.
   * @param f
   */
  const frequencyToCanvas = (f: number): number => {
    return f <= 0 ? -1 : (Math.log10(f) - 1.301) / 3
  }

  const draw_wave = (
    ctx: CanvasRenderingContext2D,
    frequencyData: Float32Array,
    width: number,
    height: number
  ) => {
    ctx.beginPath()
    ctx.moveTo(0, height)

    const w = width
    const h = height
    const iscale = 1 / (frequencyData.length - 1)

    const minDb = -100 // Minimum decibels
    const maxDb = 0 // Maximum decibels

    const sr2 = $context.sampleRate / 2
    const dx = -sr2 / (frequencyData.length * 2)
    const yscale = 1 / (maxDb - minDb)
    const y0 = minDb

    let prevX = w * frequencyToCanvas(0 * sr2 + dx)
    let prevY = h

    ctx.beginPath()
    ctx.moveTo(prevX, prevY)
    for (let i = 0; i < frequencyData.length; i++) {
      if (
        frequencyData[i] === frequencyData[i - 1] &&
        frequencyData[i] === frequencyData[i + 1]
      ) {
        continue
      }
      const db = clamp(frequencyData[i], minDb, maxDb)

      const x = w * frequencyToCanvas(i * iscale * sr2 + dx)
      const y = h * (1 - yscale * (db - y0))
      ctx.lineTo(x, prevY)
      ctx.lineTo(x, y)
      prevX = x
      prevY = y
    }

    const x = w * frequencyToCanvas(frequencyData.length * iscale * sr2 + dx)
    ctx.lineTo(x, prevY)
    ctx.lineTo(x, h)
    ctx.lineTo(0, h)

    ctx.strokeStyle = get_css_var('--foreground')
    ctx.fillStyle = get_css_var('--foreground')
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fill()
  }

  const draw = (data: Float32Array) => {
    if (canvas) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const context = canvas.getContext('2d')!

      context.clearRect(0, 0, width, height)

      draw_wave(context, data, width, height)
    }
  }

  const update_frame = () => {
    node?.getFloatFrequencyData(spec)
    next_frame = requestAnimationFrame(update_frame)
    draw(spec)
  }

  onMount(async () => {
    node = new AnalyserNode($context, { fftSize: 8192 })
    spec = new Float32Array(node.frequencyBinCount)

    requestAnimationFrame(update_frame)

    loading = false
  })

  onDestroy(() => {
    cancelAnimationFrame(next_frame)
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
        <canvas class="canvas" bind:this={canvas} />
      </div>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      label="signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
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
  .canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
