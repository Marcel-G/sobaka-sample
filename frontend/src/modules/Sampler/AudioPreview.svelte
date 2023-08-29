<script lang="ts">
  import { clamp } from 'lodash'
  import RingSpinner from '../../components/RingSpinner.svelte'
  import useDrag, { OnDrag, relative_to_element } from '../../actions/drag'
  import AudioWaveCanvas from './AudioWaveCanvas.svelte'
  import { WINDOW_SIZE } from './constants'
  import Layout from '../../components/Layout.svelte'
  import { AudioData } from '../../models/MediaManager'

  // How far along the audio the detail view is at (0-1)
  export let view_position: number
  // Data about the loaded audio file
  export let audio_data: AudioData | null

  export let on_view_change: (position: number) => void | undefined

  const handle_drag: OnDrag = (event, origin, element) => {
    const parent = element.parentElement
    if (parent instanceof Element) {
      const { x } = relative_to_element(event, origin, parent)
      const max_range = parent.clientWidth - element.clientWidth

      const position = clamp(x / max_range, 0, 1)

      on_view_change?.(position)
    }
  }

  const calculate_width = (audio: AudioData) => {
    const audio_duration = audio.data.length / audio.sample_rate
    return WINDOW_SIZE / audio_duration
  }

  $: indicator_width = audio_data ? calculate_width(audio_data) : 0
  $: left_inset = Math.max(0, view_position * (1 - indicator_width))
</script>

<div class="audio-preview">
  {#if audio_data}
    <div
      class="view-indicator"
      style={`left: ${left_inset * 100}%; width: ${indicator_width * 100}%`}
      use:useDrag={{ onDrag: handle_drag }}
    />

    <AudioWaveCanvas {audio_data} />
  {:else}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {/if}
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
