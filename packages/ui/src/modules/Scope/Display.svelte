<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { ScopeNode, ScopeMode } from '@sobaka/dsp'

  interface DisplayProps {
    node: ScopeNode
    mode: ScopeMode
  }

  let { node, mode }: DisplayProps = $props()

  let canvas: HTMLCanvasElement
  let animationFrameId: number

  // Catmull-Rom spline interpolation for smooth curves
  const catmullRomSpline = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
    const t2 = t * t
    const t3 = t2 * t
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )
  }

  const drawWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)

    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00']
    
    // Collect active channels (those with varying data indicating active signal)
    const activeChannels: { index: number, data: Float32Array }[] = []
    for (let ch = 0; ch < 4; ch++) {
      const data = node.getWaveformData(ch)
      
      // Check if channel has varying samples (not all the same value)
      // This indicates an active, changing signal rather than stale data
      let hasVariation = false
      if (data.length > 1) {
        const firstSample = data[0]
        for (let i = 1; i < Math.min(data.length, 100); i++) {
          if (Math.abs(data[i] - firstSample) > 0.0001) {
            hasVariation = true
            break
          }
        }
      }
      
      if (hasVariation) {
        activeChannels.push({ index: ch, data })
      }
    }

    // If no active channels, show a message
    if (activeChannels.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No signal connected', width / 2, height / 2)
      return
    }

    // Divide screen by number of active channels
    const channelHeight = height / activeChannels.length

    activeChannels.forEach((channel, displayIndex) => {
      const yOffset = displayIndex * channelHeight + channelHeight / 2

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = displayIndex * channelHeight + (i * channelHeight / 4)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Find valid sample count (when zoomed in, buffer is partially filled)
      // The processor zeros out unused samples, so find the last non-zero sample
      let validSampleCount = channel.data.length
      
      // Check if we have a partially filled buffer (zoomed in case)
      // Look for a sequence of zeros at the end
      let consecutiveZeros = 0
      for (let i = channel.data.length - 1; i >= 0; i--) {
        if (Math.abs(channel.data[i]) < 0.00001) {
          consecutiveZeros++
        } else {
          break
        }
      }
      
      // If we have a significant number of trailing zeros, the buffer is partially filled
      if (consecutiveZeros > 100) {
        validSampleCount = channel.data.length - consecutiveZeros
      }
      
      // Ensure we have at least some samples
      if (validSampleCount < 10) validSampleCount = channel.data.length

      // Draw waveform with interpolation when zoomed in
      ctx.strokeStyle = colors[channel.index]
      ctx.lineWidth = 1.5
      ctx.beginPath()

      const samplesPerPixel = validSampleCount / width
      
      if (samplesPerPixel < 1.0) {
        // Zoomed in: fewer samples than pixels, use Catmull-Rom interpolation
        const pixelsPerSample = width / validSampleCount
        
        for (let x = 0; x < width; x++) {
          // Find which sample segment we're in
          const samplePos = x / pixelsPerSample
          const sampleIndex = Math.floor(samplePos)
          const t = samplePos - sampleIndex // fractional part
          
          // Get 4 control points for Catmull-Rom spline
          const i0 = Math.max(0, sampleIndex - 1)
          const i1 = Math.min(validSampleCount - 1, sampleIndex)
          const i2 = Math.min(validSampleCount - 1, sampleIndex + 1)
          const i3 = Math.min(validSampleCount - 1, sampleIndex + 2)
          
          const p0 = channel.data[i0]
          const p1 = channel.data[i1]
          const p2 = channel.data[i2]
          const p3 = channel.data[i3]
          
          const interpolatedValue = catmullRomSpline(p0, p1, p2, p3, t)
          const y = yOffset - (interpolatedValue * channelHeight * 0.45)
          
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
      } else {
        // Zoomed out: more samples than pixels, use original rendering
        for (let i = 0; i < validSampleCount; i++) {
          const x = (i / validSampleCount) * width
          const y = yOffset - (channel.data[i] * channelHeight * 0.45)
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
      }

      ctx.stroke()

      // Draw zero line (brighter)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, yOffset)
      ctx.lineTo(width, yOffset)
      ctx.stroke()

      // Draw channel label
      ctx.fillStyle = colors[channel.index]
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`Ch ${channel.index + 1}`, 5, displayIndex * channelHeight + 5)
    })
  }

  const drawSpectrum = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)

    const data = node.getSpectrumData()
    if (data.length === 0) return

    const sampleRate = 48000 // Assume 48kHz, could get from audioContext
    const nyquist = sampleRate / 2
    const minFreq = 20
    const maxFreq = 20000
    const minDb = -100  // Show more of the low end for high frequencies
    const maxDb = 20    // Allow headroom for hot signals

    // Helper: Convert frequency to logarithmic x position
    const freqToX = (freq: number): number => {
      const logMin = Math.log10(minFreq)
      const logMax = Math.log10(maxFreq)
      const logFreq = Math.log10(freq)
      return ((logFreq - logMin) / (logMax - logMin)) * width
    }

    // Helper: Convert bin index to frequency
    const binToFreq = (bin: number): number => {
      return (bin * nyquist) / data.length
    }

    // Draw frequency grid lines (musical octaves)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const freqMarkers = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
    freqMarkers.forEach(freq => {
      if (freq >= minFreq && freq <= maxFreq) {
        const x = freqToX(freq)
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
        
        // Draw frequency label
        const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`
        ctx.fillText(label, x, height - 15)
      }
    })

    // Draw dB grid lines
    const dbStep = 20
    for (let db = Math.ceil(minDb / dbStep) * dbStep; db <= maxDb; db += dbStep) {
      const normalizedDb = (db - minDb) / (maxDb - minDb)
      const y = height - (normalizedDb * height)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      
      // Draw dB label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${db}dB`, width - 5, y)
    }

    // Draw spectrum with logarithmic frequency scale
    // Use a map to accumulate max values for each x pixel
    const pixelMap = new Map<number, number>()
    
    for (let bin = 0; bin < data.length; bin++) {
      const freq = binToFreq(bin)
      if (freq < minFreq || freq > maxFreq) continue
      
      const x = Math.floor(freqToX(freq))
      const normalizedDb = Math.max(0, Math.min(1, (data[bin] - minDb) / (maxDb - minDb)))
      const y = height - (normalizedDb * height)
      
      // Keep the maximum value for each pixel
      if (!pixelMap.has(x) || y < pixelMap.get(x)!) {
        pixelMap.set(x, y)
      }
    }

    // Interpolate missing pixels to avoid gaps
    const interpolatedMap = new Map<number, number>()
    let lastKnownX = -1
    let lastKnownY = height
    
    for (let x = 0; x <= width; x++) {
      if (pixelMap.has(x)) {
        interpolatedMap.set(x, pixelMap.get(x)!)
        lastKnownX = x
        lastKnownY = pixelMap.get(x)!
      } else if (lastKnownX >= 0) {
        // Find next known value
        let nextKnownX = -1
        let nextKnownY = height
        for (let nx = x + 1; nx <= width; nx++) {
          if (pixelMap.has(nx)) {
            nextKnownX = nx
            nextKnownY = pixelMap.get(nx)!
            break
          }
        }
        
        // Interpolate between last and next known values
        if (nextKnownX > 0) {
          const t = (x - lastKnownX) / (nextKnownX - lastKnownX)
          const y = lastKnownY + (nextKnownY - lastKnownY) * t
          interpolatedMap.set(x, y)
        } else {
          // No next value, use last known
          interpolatedMap.set(x, lastKnownY)
        }
      }
    }

    // Draw a subtle fill under the curve first
    ctx.fillStyle = 'rgba(0, 255, 255, 0.15)'
    ctx.beginPath()
    ctx.moveTo(0, height) // Start at bottom-left
    
    // Draw the curve from left to right
    for (let x = 0; x <= width; x++) {
      const y = interpolatedMap.get(x) ?? height
      ctx.lineTo(x, y)
    }
    
    // Close the path along the bottom
    ctx.lineTo(width, height) // Bottom-right
    ctx.lineTo(0, height) // Back to bottom-left
    ctx.closePath()
    ctx.fill()

    // Draw the spectrum curve on top
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    let first = true
    for (let x = 0; x <= width; x++) {
      const y = interpolatedMap.get(x) ?? height
      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.stroke()

    // Find and mark the fundamental frequency (peak)
    let maxBin = 0
    let maxValue = -Infinity
    for (let bin = 0; bin < data.length; bin++) {
      const freq = binToFreq(bin)
      if (freq >= minFreq && freq <= maxFreq && data[bin] > maxValue) {
        maxValue = data[bin]
        maxBin = bin
      }
    }

    if (maxValue > minDb + 20) { // Only show if peak is significant
      const peakFreq = binToFreq(maxBin)
      const peakX = freqToX(peakFreq)
      
      // Draw peak marker line
      ctx.strokeStyle = '#ff00ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(peakX, 0)
      ctx.lineTo(peakX, height)
      ctx.stroke()
      
      // Draw peak frequency label in top-left corner with background
      const label = `${peakFreq.toFixed(1)}Hz`
      ctx.font = '14px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      
      // Measure text for background
      const textMetrics = ctx.measureText(label)
      const textWidth = textMetrics.width
      const textHeight = 16
      const padding = 4
      
      // Draw background rectangle
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(5, 5, textWidth + padding * 2, textHeight + padding)
      
      // Draw text
      ctx.fillStyle = '#ff00ff'
      ctx.fillText(label, 5 + padding, 5 + padding)
    }
  }

  const draw = () => {
    if (!canvas) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (mode === 'waveform') {
      drawWaveform(ctx, width, height)
    } else {
      drawSpectrum(ctx, width, height)
    }

    animationFrameId = requestAnimationFrame(draw)
  }

  onMount(() => {
    draw()
  })

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  })
</script>

<div class="relative flex-1 overflow-hidden bg-dark shadow-[inset_0_0_0.25rem_var(--color-darker)] rounded-[5px]">
  <canvas bind:this={canvas} class="absolute inset-0 w-full h-full"></canvas>
</div>
