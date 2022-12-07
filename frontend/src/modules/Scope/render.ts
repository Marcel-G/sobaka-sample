import { get, writable } from 'svelte/store';

type Point = {
  min: number,
  max: number,
  count: number
};

const BUFFER_SIZE = 256;

const new_point = (): Point => ({ min: Infinity, max: -Infinity, count: 0 })

export type Scope = ReturnType<typeof create_scope>;

export const create_scope = (ctx: AudioContext) => {
  const fftSize = 512
  const analyserNode = new AnalyserNode(ctx, { fftSize })

  const canvas_store = writable<HTMLCanvasElement>()
  const threshold_store = writable<number>(0.5)
  const time_store = writable<number>(0)
  const trigger_store = writable<boolean>(false)

  const audio_buffer = new Float32Array(fftSize);
  const graph_buffer = Array.from(
    { length: BUFFER_SIZE },
    new_point
  )
  let next_point: Point = new_point()
  let index = 0;
  let is_open = false;

  const trigger = (y: number, off_threshold: number, on_threshold: number): boolean | undefined => {
    if (is_open) {
      if (y <= off_threshold) {
        is_open = false
        return false
      }
    } else if (y >= on_threshold) {
      is_open = true
      return true
    }
  }

  const process = (time: number, threshold: number, trigger_enabled: boolean) => {
    analyserNode.getFloatTimeDomainData(audio_buffer);

    for (const y of audio_buffer) {
      if (index >= BUFFER_SIZE) {
        if (!trigger_enabled || trigger(y, threshold, threshold + 0.001) === true) {
          index = 0;
        }
      } else {
        const delta_time = Math.pow(2, -time) / BUFFER_SIZE
        const frame_count = Math.ceil(delta_time * ctx.sampleRate)

        next_point.min = Math.min(y, next_point.min)
        next_point.max = Math.max(y, next_point.max)
        next_point.count += 1;

        if (next_point.count >= frame_count) {
          graph_buffer[index] = next_point
          next_point = new_point()
          index += 1
        } 
      }
    }
  }

  const get_css_var = (name: string): string => {
    return getComputedStyle(get(canvas_store)).getPropertyValue(name)
  }

  const draw_background = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
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

  let next_frame: number;
  let next_data: NodeJS.Timeout;

  const data_loop = () => {
    process(
      get(time_store),
      get(threshold_store),
      get(trigger_store),
    )
  }

  const draw = () => {
    const canvas = get(canvas_store);
    if (canvas) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const context = canvas.getContext('2d')!
      draw_background(context, width, height)
      draw_wave(context, graph_buffer, width, height)
    }

    next_frame = requestAnimationFrame(draw)
  }

  const start = () => {

    /**
     * JS Intervals are not precise enough to properly sync this with the
     * Data in the AnalyserNode. This causes some jitter at times in the scope.
     */
    const ms = (fftSize / ctx.sampleRate) * 1000
    next_data = setInterval(data_loop, ms)
    next_frame = requestAnimationFrame(draw)
  }

  const stop = () => {
    clearTimeout(next_data)
    cancelAnimationFrame(next_frame)
  }

  return {
    start,
    stop,
    threshold: threshold_store,
    time: time_store,
    trigger: trigger_store,
    canvas: canvas_store,
    node: analyserNode
  }
}