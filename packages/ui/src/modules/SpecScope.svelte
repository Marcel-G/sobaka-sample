<script context="module" lang="ts">
  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { onDestroy, onMount } from 'svelte'
  import { getGlobalCtx } from '../context/global'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { PlugType } from '@sobaka/state/models/links'

  export let disabled = false
  let name = 'spec_scope'
  let node: AnalyserNode
  let loading = true

  let canvas: HTMLCanvasElement

  let spec: Float32Array

  let next_frame: number

  const context = getGlobalCtx()

  const get_css_var = (name: string): string => {
    return getComputedStyle(canvas).getPropertyValue(name)
  }

  const draw_wave = (
    ctx: CanvasRenderingContext2D,
    frequencyData: Float32Array,
    width: number,
    height: number
  ) => {
    // Graph view parameters
    const minFreq = 20 // Minimum frequency to display (in Hz)
    const maxFreq = 5000 // Maximum frequency to display (in Hz)
    const minDB = -120 // Minimum dB to display
    const maxDB = 0 // Maximum dB to display

    // Logarithmic frequency scale conversion
    const frequencyToIndex = (frequency: number) => {
      const nyquist = context.audio.sampleRate / 2
      const index = Math.round((frequency / nyquist) * frequencyData.length)
      return index
    }

    // Logarithmic frequency scale conversion
    const frequencyToX = (frequency: number) => {
      const logMinFreq = Math.log10(minFreq)
      const logMaxFreq = Math.log10(maxFreq)
      const logFrequency = Math.log10(frequency)
      const x = ((logFrequency - logMinFreq) / (logMaxFreq - logMinFreq)) * width
      return x
    }

    // Db scale conversion
    const amplitudeToY = (amplitude: number) => {
      const percentage = (amplitude - minDB) / (maxDB - minDB)
      const y = height - percentage * height
      return y
    }

    // Find the tallest peak and its fundamental frequency
    let maxAmplitude = -Infinity
    let maxAmplitudeIndex = -1

    ctx.beginPath()
    ctx.moveTo(0, height)

    for (let i = frequencyToIndex(minFreq); i < frequencyToIndex(maxFreq); i++) {
      const frequency = i * (context.audio.sampleRate / node.fftSize)

      const amplitude = frequencyData[i]

      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude
        maxAmplitudeIndex = i
      }

      const x = frequencyToX(frequency)
      const y = amplitudeToY(amplitude)

      ctx.lineTo(x, y)
    }

    ctx.lineTo(width, height)
    ctx.closePath()
    ctx.fillStyle = get_css_var('--color-light')
    ctx.fill()

    // Draw line at the tallest peak (fundamental frequency)
    const fundamentalFreq = maxAmplitudeIndex * (context.audio.sampleRate / node.fftSize)
    const fundamentalX = frequencyToX(fundamentalFreq)
    if (fundamentalFreq >= minFreq && fundamentalFreq <= maxFreq) {
      ctx.strokeStyle = get_css_var('--color-module-accent')
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(fundamentalX, 0)
      ctx.lineTo(fundamentalX, height)
      ctx.stroke()

      // Render fundamental frequency in the bottom left corner
      ctx.fillStyle = get_css_var('--color-light')
      ctx.font = '12px monospace'
      ctx.fillText(`${fundamentalFreq.toFixed(2)}Hz`, 10, 15)
    }
  }

  const draw = (data: Float32Array) => {
    if (canvas) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

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
    node = new AnalyserNode(context.audio, { fftSize: 8192 })
    spec = new Float32Array(node.frequencyBinCount)

    requestAnimationFrame(update_frame)

    loading = false
  })

  onDestroy(() => {
    cancelAnimationFrame(next_frame)
  })
</script>

<Panel
  {name}
  height={15}
  width={13}
  {disabled}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <div class="scope-controls">
      <div class="screen">
        <canvas class="canvas" bind:this={canvas}></canvas>
      </div>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={0}
      {disabled}
      label="signal"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>

<style>
  .screen {
    position: relative;
    overflow: hidden;
    background-color: var(--color-dark);
    box-shadow: inset 0 0 0.25rem var(--color-darker);
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
  .canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
