import { AudioData } from '../../worker/media'

interface Renderable {
  should_render: () => boolean
  render: (
    context: CanvasRenderingContext2D,
    dims: { height: number; width: number }
  ) => void
}

interface Wave extends Renderable {
  update_wave: (data: AudioData) => void
}

const create_wave = (): Wave => {
  let audio_data: AudioData | null = null
  let needs_render = false

  return {
    update_wave: (data: AudioData) => {
      audio_data = data // @todo probably this can be optimised here
      needs_render = true
    },
    should_render: () => needs_render,
    render: (context, { height, width }) => {
      if (!audio_data) return
      context.clearRect(0, 0, width, height)
      // Draw waveform to canvas  (WIP)
      const step = Math.ceil(audio_data.data.length / width)
      const amp = height / 2
      for (let i = 0; i < width; i++) {
        let min = 1.0
        let max = -1.0
        for (let j = 0; j < step; j++) {
          const datum = audio_data.data[i * step + j]
          if (datum < min) min = datum
          if (datum > max) max = datum
        }
        context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp))
      }

      needs_render = false
    }
  }
}

interface Segment extends Renderable {
  update_detections: (detections: number[]) => void
  update_active: (detections: number) => void
}

const create_segments = (): Segment => {
  let active_segment = -1
  let detections: number[] = []
  let needs_render = false

  return {
    update_active: active => {
      active_segment = active
      needs_render = true
    },
    update_detections: _detections => {
      detections = _detections
      needs_render = true
    },
    should_render: () => needs_render,
    render: (context, { height, width }) => {
      context.clearRect(0, 0, width, height)

      if (active_segment >= 0 && active_segment < detections.length) {
        const a = detections[active_segment] * width
        const b = detections[active_segment + 1] * width

        const fill = context.fillStyle
        context.fillStyle = 'red'
        context.globalAlpha = 0.2
        context.fillRect(a, 0, b - a, height)
        context.fillStyle = fill
        context.globalAlpha = 1.0
      }
      // Draw detections to canvas  (WIP)
      for (const detection of detections) {
        const x = detection * width

        const fill = context.fillStyle
        context.fillStyle = 'red'
        context.globalAlpha = 0.8
        context.fillRect(x, 0, 1.0, height)
        context.fillStyle = fill
        context.globalAlpha = 1.0
      }

      needs_render = false
    }
  }
}

export const init_canvas = () => {
  const layer_1 = document.createElement('canvas')
  const layer_2 = document.createElement('canvas')

  layer_1.style.position = 'absolute'
  layer_2.style.position = 'absolute'

  const wave = create_wave()
  const segments = create_segments()
  let animation_frame: number
  let mount_point: HTMLElement

  const mount = (_mount_point: HTMLElement) => {
    cleanup()
    mount_point = _mount_point

    mount_point.appendChild(layer_1)
    mount_point.appendChild(layer_2)

    render()
  }

  const render = () => {
    const context_1 = layer_1.getContext('2d')!
    const context_2 = layer_2.getContext('2d')!

    const width = mount_point.clientWidth
    const height = mount_point.clientHeight

    if (layer_1.width !== width || layer_1.height !== height) {
      layer_1.width = width
      layer_1.height = height

      wave.render(context_1, { height, width })
    }

    if (layer_2.width !== width || layer_2.height !== height) {
      layer_2.width = width
      layer_2.height = height

      segments.render(context_2, { height, width })
    }

    if (wave.should_render()) wave.render(context_1, { height, width })
    if (segments.should_render()) segments.render(context_2, { height, width })

    animation_frame = requestAnimationFrame(render)
  }

  const cleanup = () => {
    cancelAnimationFrame(animation_frame)
  }

  return {
    update_wave: wave.update_wave,
    update_detections: segments.update_detections,
    update_active: segments.update_active,
    render,
    mount,
    cleanup
  }
}
