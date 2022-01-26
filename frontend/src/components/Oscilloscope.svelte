<script lang="ts">
  import type { SobakaContext } from 'sobaka-sample-audio-worklet'
  import { getContext, onMount } from 'svelte'
  import { get } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  const context: Writable<SobakaContext> = getContext('sampler')

  let canvas: HTMLCanvasElement

  let pixelRatio = 2 //window.devicePixelRatio;
  let width = 800
  let height = 100

  let paused = false

  let fftSize = 2048 * 16

  let analyserNode = new AnalyserNode(get(context).context, { fftSize })

  get(context).connect(analyserNode)

  let u8ar = new Uint8Array(fftSize)

  let draw_fn: () => void // @todo this is wird

  const DEFAULT_FILL = '#111111'
  const DEFAULT_STROKE = '#11ff11'
  function init(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = DEFAULT_FILL
    ctx.strokeStyle = DEFAULT_STROKE
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
    for (let i = 0; i < data.length; i++) {
      let x = i * (width / data.length) // need to fix x
      let v = data[i] / 128.0
      let y = (v * height) / 2
      if (v >= 2.0 || v <= 0.0) {
        let fill = ctx.fillStyle
        ctx.fillStyle = 'red'
        ctx.fillRect(x, y, 1, height)
        ctx.fillStyle = fill
      }
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  onMount(() => {
    const context = canvas.getContext('2d')!
    init(context, width * pixelRatio, height * pixelRatio)
    context.fillRect(0, 0, width * pixelRatio, height * pixelRatio)

    function draw() {
      if (!paused) requestAnimationFrame(draw)
      context.clearRect(0, 0, width * pixelRatio, height * pixelRatio)
      primer(context, width * pixelRatio, height * pixelRatio)
      analyserNode.getByteTimeDomainData(u8ar)
      drawRawOsc(context, u8ar, width * pixelRatio, height * pixelRatio)
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

<canvas
  bind:this={canvas}
  on:click={handle_click}
  width={width * pixelRatio}
  height={height * pixelRatio}
  style="width: {width}px; height: {height}px;"
/>
