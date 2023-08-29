<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { get_context as get_audio_context } from '../audio'
  export let module: AudioNode
  const context = get_audio_context()

  let canvas: HTMLCanvasElement

  let paused = false

  let fftSize = 2048 * 16

  function get_css_var(name: string): string {
    return getComputedStyle(canvas).getPropertyValue(name)
  }

  const ctx = get(context).audio

  let analyserNode = new AnalyserNode(ctx, { fftSize })

  module.connect(analyserNode)

  let u8ar = new Uint8Array(fftSize)

  let draw_fn: () => void // @todo this is wird

  function init(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = get_css_var('--module-background')
    ctx.strokeStyle = get_css_var('--module-foreground')
    ctx.lineWidth = 2
  }
  function primer(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillRect(0, 0, width, height)
  }
  function drawRawOsc(
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    width: number,
    height: number
  ) {
    ctx.beginPath()
    const reduced = data.filter((_, i) => !(i % 32)) // Take every 32nd sample

    reduced.forEach((value, i, data) => {
      let x = i * (width / data.length) // need to fix x
      let v = value / 128.0
      let y = (v * height) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    reduced.forEach((value, i, data) => {
      let x = i * (width / data.length) // need to fix x
      let v = value / 128.0
      if (v >= 2.0 || v <= 0.0) {
        let fill = ctx.fillStyle
        ctx.fillStyle = get_css_var('--red')
        ctx.fillRect(x, v, 1, height)
        ctx.fillStyle = fill
      }
    })
  }
  onMount(() => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const context = canvas.getContext('2d')!
    init(context)
    context.fillRect(0, 0, canvas.width, canvas.height)

    function draw() {
      if (!canvas) return
      if (!paused) requestAnimationFrame(draw)
      context.clearRect(0, 0, width, height)
      primer(context, width, height)
      analyserNode.getByteTimeDomainData(u8ar)
      drawRawOsc(context, u8ar, width, height)
    }

    draw_fn = draw

    draw()
  })

  function handle_click() {
    if (paused) {
      paused = false
      if (draw_fn) draw_fn()
    } else {
      paused = true
    }
  }
</script>

<canvas class="canvas" bind:this={canvas} on:click={handle_click} />

<style>
  .canvas {
    width: 100%;
    height: 100%;
  }
</style>
