<script lang="ts">
  import { Point } from 'sobaka-dsp'

  export let data: Point[]

  let canvas: HTMLCanvasElement

  const get_css_var = (name: string): string => {
    return getComputedStyle(canvas).getPropertyValue(name)
  }

  const draw_wave = (
    ctx: CanvasRenderingContext2D,
    graph: Point[],
    width: number,
    height: number
  ) => {
    ctx.beginPath()
    graph.forEach((point, i) => {
      const x = i / (graph.length - 1)
      const y = point.max * -0.5 + 0.5
      if (i == 0) {
        ctx.moveTo(x * width, y * height - 1.0)
      } else {
        ctx.lineTo(x * width, y * height - 1.0)
      }
    })

    graph
      .slice()
      .reverse()
      .forEach((point, i) => {
        const x = (graph.length - (i + 1)) / (graph.length - 1)
        const y = point.min * -0.5 + 0.5
        ctx.lineTo(x * width, y * height + 1.0)
      })

    ctx.closePath()
    ctx.fillStyle = get_css_var('--foreground')
    ctx.strokeStyle = get_css_var('--foreground')
    ctx.lineWidth = 1
    ctx.fill()
    ctx.stroke()
  }

  const draw = (data: Point[]) => {
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

  $: draw(data)
</script>

<div class="oscilloscope-wrapper">
  <canvas class="canvas" bind:this={canvas} />
</div>

<style>
  .oscilloscope-wrapper {
    flex: 1 1 auto;
    position: relative;
  }

  .canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
