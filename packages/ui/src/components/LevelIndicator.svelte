<script lang="ts">
  import { onMount } from 'svelte'

  export let module: AudioNode

  const BARS = 8 // Number of "LED" segments
  const FFT_SIZE = 2048
  let levels: number[] = Array(BARS).fill(0)

  let analyser: AnalyserNode
  let paused = false

  onMount(() => {
    analyser = new AnalyserNode(module.context, {
      fftSize: FFT_SIZE,
      smoothingTimeConstant: 0.8
    })

    module.connect(analyser)

    const dataArray = new Float32Array(FFT_SIZE)

    function updateLevels() {
      if (!paused) {
        requestAnimationFrame(updateLevels)
      }

      analyser.getFloatTimeDomainData(dataArray)

      // Calculate RMS
      const rms = Math.sqrt(
        dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length
      )

      // Map RMS to levels array
      const scaledRMS = Math.min(Math.max(rms * 2, 0), 1)
      levels = Array(BARS)
        .fill(0)
        .map((_, i) => (scaledRMS >= i / BARS ? 1 : 0))
        .reverse() // Reverse array to show levels bottom-to-top
    }

    updateLevels()

    return () => {
      paused = true
      try {
        module.disconnect(analyser)
      } catch (err) {
        // Node may already be disconnected if parent was destroyed
      }
    }
  })
</script>

<div class="flex flex-col gap-0.5 w-4">
  {#each levels as level, i}
    <div
      class="h-1 rounded-sm transition-colors duration-75"
      class:bg-emerald-500={i >= BARS * 0.4 && level}
      class:bg-yellow-500={i >= BARS * 0.2 && i < BARS * 0.4 && level}
      class:bg-red-500={i < BARS * 0.2 && level}
      class:bg-zinc-700={!level}
    ></div>
  {/each}
</div>
