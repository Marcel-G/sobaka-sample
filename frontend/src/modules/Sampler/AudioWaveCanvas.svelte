<script lang="ts">
  import { AudioData } from "../../models/MediaManager"

  // Data about the loaded audio file
  export let audio_data: AudioData

  let canvas: HTMLCanvasElement

  const get_css_var = (name: string): string => {
    return getComputedStyle(canvas).getPropertyValue(name)
  }

  const render = (canvas: HTMLCanvasElement, audio_data: AudioData) => {
    // @todo something is off here
    canvas.width = canvas.parentElement!.clientWidth
    canvas.height = canvas.parentElement!.clientHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const zoomLevel = 0.1
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = get_css_var('--pink-dark')
    ctx.lineWidth = 1
    ctx.beginPath()
    const zoomedWidth = audio_data.data.length / zoomLevel
    const step = zoomedWidth / width
    let x = 0
    for (let i = 0; i < zoomedWidth; i += step) {
      const slice = audio_data.data.slice(i * zoomLevel, (i + step) * zoomLevel)
      const min = Math.min(...slice)
      const max = Math.max(...slice)
      const yMin = ((1 - min) * height) / 2
      const yMax = ((1 - max) * height) / 2
      ctx.moveTo(x, yMin)
      ctx.lineTo(x, yMax)
      x++
    }
    ctx.stroke()
  }

  $: if (canvas) render(canvas, audio_data)
</script>

<canvas bind:this={canvas} />

<style>
  canvas {
    position: absolute;
    inset: 0;
  }
</style>
