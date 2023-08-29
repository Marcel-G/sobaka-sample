<script lang="ts">
  import Layout from '../../components/Layout.svelte'
  import RingSpinner from '../../components/RingSpinner.svelte'
  import { AudioData } from '../../models/MediaManager'
  import AudioSegments from './AudioSegments.svelte'
  import AudioWaveCanvas from './AudioWaveCanvas.svelte'
  import { WINDOW_SIZE } from './constants'

  // How far along the audio the detail view is at (0-1)
  export let view_position: number
  // Data about the loaded audio file
  export let audio_data: AudioData | null
  // List of transient segments (sample index)
  export let segments: number[]
  // The rate of the audio playback (used for the animation)
  export let playback_rate: number
  // The currently active audio segment (index)
  export let active_segment: number
  // Triggered when a segment is clicked
  export let on_segment_click: (segment_index: number) => void
  // Trigger the play animation on some segment
  export let trigger_segment: (segment_index: number) => void

  const calculate_width = (audio: AudioData) => {
    const audio_duration = audio.data.length / audio.sample_rate
    return audio_duration * WINDOW_SIZE
  }

  $: indicator_width = audio_data ? calculate_width(audio_data) : 0
  $: left_inset = Math.min(0, view_position * (1 - indicator_width))
</script>

<div class="audio-detail">
  {#if audio_data}
    <div
      class="audio-slider"
      style={`left: ${left_inset * 100}%; width: ${indicator_width * 100}%`}
    >
      <AudioSegments
        {audio_data}
        {segments}
        {playback_rate}
        {active_segment}
        {on_segment_click}
        bind:trigger_segment
      />
      <AudioWaveCanvas {audio_data} />
    </div>
  {:else}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {/if}
</div>

<style>
  .audio-detail {
    position: relative;
    overflow: hidden;
    flex: 1 0 50%;
    margin: 0.25rem;
    padding: 0 1rem;
    background-color: var(--module-knob-background);
    box-shadow: inset 0 0 0.25rem var(--background);

    border-radius: 5px;
  }

  .audio-slider {
    position: relative;
    height: 100%;
  }
</style>
