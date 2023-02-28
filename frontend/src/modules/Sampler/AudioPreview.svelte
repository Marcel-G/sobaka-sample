<script lang="ts">
  import { clamp } from 'lodash'
  import useDrag, { OnDrag } from '../../actions/drag'
  import { AudioData } from '../../worker/media'
  import AudioWaveCanvas from './AudioWaveCanvas.svelte'
  import { WINDOW_SIZE } from './constants'

  // How far along the audio the detail view is at (0-1)
  export let view_position: number
  // Data about the loaded audio file
  export let audio_data: AudioData

  export let on_view_change: (position: number) => void | undefined

  const handle_viewport_move: OnDrag = (x_in, _, element) => {
    const parentElement = element.parentElement
    if (!parentElement) return
    const max_range = parentElement.clientWidth - element.clientWidth

    const position = clamp(x_in / max_range, 0, 1)

    on_view_change?.(position)
  }

  const calculate_width = () => {
    const audio_duration = audio_data.data.length / audio_data.sample_rate
    return WINDOW_SIZE / audio_duration
  }

  $: indicator_width = calculate_width()
  $: left_inset = Math.max(0, view_position * (1 - indicator_width))
</script>

<div class="audio-preview">
  <div
    class="view-indicator"
    style={`left: ${left_inset * 100}%; width: ${indicator_width * 100}%`}
    use:useDrag={handle_viewport_move}
  />

  <AudioWaveCanvas {audio_data} />
</div>

<style>
  .audio-preview {
    position: relative;
    flex: 1 0 15%;
    margin: 0.25rem;
    padding: 0.5rem;
    border-radius: 5px;
    background-color: var(--module-knob-background);
    box-shadow: inset 0 0 0.25rem var(--background);
  }

  .view-indicator {
    position: absolute;
    outline: 2px solid var(--module-highlight);
    z-index: 1;
    border-radius: 5px;
    cursor: grab;
    inset: 0;
    backdrop-filter: brightness(1.5);
    max-width: 100%;
  }
</style>
