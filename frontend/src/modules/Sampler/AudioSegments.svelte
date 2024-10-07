<script lang="ts">
  import { AudioData } from './constants'

  // Data about the loaded audio file
  export let audio_data: AudioData
  // List of transient segments (sample index)
  export let segments: number[]
  // The rate of the audio playback (used for the animation)
  export let playback_rate: number
  // The currently active audio segment (index)
  export let active_segment: number
  // Triggered when a segment is clicked
  export let on_segment_click: (segment_index: number) => void

  export const trigger_segment = (segment_index: number) => {
    const ref = segment_refs[segment_index]
    const width = segment_widths[segment_index]

    const sample_duration = (width * audio_data.data.length) / audio_data.sample_rate

    if (ref && width) {
      ref.animate(
        [
          { backgroundSize: '0% 100%', opacity: 1 },
          { backgroundSize: '100% 100%' },
          { backgroundSize: '200% 100%', opacity: 0 }
        ],
        {
          duration: (sample_duration * 2000) / playback_rate, // specify the animation duration in milliseconds
          easing: 'linear', // specify the easing function
          fill: 'forwards' // keep the final state of the animation
        }
      )
    }
  }

  let segment_refs: HTMLDivElement[] = []
  const diff = (list: number[]) => list.slice(1).map((n, i) => n - list[i])

  $: segment_widths = diff(
    segments
      // this part is normalization
      .map(segment => segment / audio_data.data.length)
  )
</script>

<div class="segments">
  {#each segment_widths as width, i}
    <div
      class="segment"
      class:active={active_segment === i}
      style={`width: ${width * 100}%`}
      on:click={() => on_segment_click(i)}
    >
      <div class="background" bind:this={segment_refs[i]} />
      <div class="marker">{i + 1}</div>
    </div>
  {/each}
</div>

<style>
  .segments {
    position: absolute;
    z-index: 1;
    inset: 0;
    display: flex;
    flex-direction: row;
  }

  .segment {
    position: relative;
    height: 100%;
  }

  .segment::after {
    content: '';
    position: absolute;
    width: 2px;
    background-color: var(--module-highlight);
    transform: translateX(-50%);
    inset: 0;
    margin: 0.25rem 0;
    box-sizing: content-box;
  }

  .segment .marker {
    position: absolute;
    background-color: var(--module-highlight);
    font-family: monospace;
    bottom: 0;
    margin: 0.25rem 0;
    padding: 0.5rem 0.25rem 0.25rem 0.25rem;
    transform: translate(-50%);
    border-radius: 10%;
    z-index: 2;
    clip-path: polygon(50% 0%, 0% 25%, 0% 100%, 100% 100%, 100% 25%);
  }

  .segment.active {
    backdrop-filter: brightness(1.5);
  }
  .segment .background {
    position: absolute;
    inset: 0;
    opacity: 0;
    background-image: linear-gradient(to left, var(--module-highlight), transparent);
  }
</style>
