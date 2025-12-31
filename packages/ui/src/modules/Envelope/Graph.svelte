<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EnvelopeNode, type GateEventData } from '@sobaka/dsp'

  interface Props {
    node: EnvelopeNode
    attack: number
    decay: number
    sustain: number
    release: number
  }

  let {
    node,
    attack,
    decay,
    sustain,
    release
  }: Props = $props()

  type EnvelopePhase = 'idle' | 'attack' | 'decay' | 'sustain' | 'release' | 'fadeout'

  // Track current envelope phase and progress
  let currentPhase = $state<EnvelopePhase>('idle')
  let currentProgress = $state(0)
  let animationFrame: number | null = null
  let phaseStartTime = 0
  let fadeOpacity = $state(1.0)

  const handleGateEvent = (event: GateEventData) => {
    if (event.type === 'open') {
      currentPhase = 'attack'
      currentProgress = 0
      fadeOpacity = 1.0
      phaseStartTime = performance.now()
      startAnimation()
    } else if (event.type === 'close') {
      currentPhase = 'release'
      currentProgress = 0
      fadeOpacity = 1.0
      phaseStartTime = performance.now()
      startAnimation()
    }
  }

  const startAnimation = () => {
    if (animationFrame !== null) return
    
    const animate = () => {
      const now = performance.now()
      const elapsed = (now - phaseStartTime) / 1000
      
      switch (currentPhase) {
        case 'attack': {
          const attackTime = attack
          if (elapsed >= attackTime) {
            currentPhase = 'decay'
            currentProgress = 0
            phaseStartTime = now
          } else {
            currentProgress = elapsed / Math.max(attackTime, 0.001)
          }
          break
        }
        case 'decay': {
          const decayTime = decay
          if (elapsed >= decayTime) {
            currentPhase = 'sustain'
            currentProgress = 0
            phaseStartTime = now
          } else {
            currentProgress = elapsed / Math.max(decayTime, 0.001)
          }
          break
        }
        case 'sustain': {
          // Quickly animate to the end of the sustain section
          const sustainAnimationTime = 0.1 // 100ms to reach the end
          if (elapsed >= sustainAnimationTime) {
            currentProgress = 1.0 // Stay at the end
          } else {
            currentProgress = elapsed / sustainAnimationTime
          }
          break
        }
        case 'release': {
          const releaseTime = release
          if (elapsed >= releaseTime) {
            currentPhase = 'fadeout'
            currentProgress = 1.0
            phaseStartTime = now
          } else {
            currentProgress = elapsed / Math.max(releaseTime, 0.001)
          }
          break
        }
        case 'fadeout': {
          const fadeTime = 0.3 // 300ms fade out
          if (elapsed >= fadeTime) {
            currentPhase = 'idle'
            currentProgress = 0
            fadeOpacity = 0
            animationFrame = null
            return
          } else {
            fadeOpacity = 1.0 - (elapsed / fadeTime)
          }
          break
        }
        case 'idle': {
          animationFrame = null
          return
        }
      }
      
      animationFrame = requestAnimationFrame(animate)
    }
    
    animationFrame = requestAnimationFrame(animate)
  }

  onMount(() => {
    node.addGateListener(handleGateEvent)
  })

  onDestroy(() => {
    node.removeGateListener(handleGateEvent)
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
    }
  })

  // Fixed width for each segment (equal spacing)
  const SEGMENT_WIDTH = 1
  const PADDING_Y = 0.05
  const PADDING_X = 0.0
  const HEIGHT = 1

  // Calculate path for ADSR envelope
  // adsr_live goes: 0 -> 1 (attack) -> sustain (decay) -> sustain (sustain) -> 0 (release)
  const attackX = SEGMENT_WIDTH
  const decayX = attackX + SEGMENT_WIDTH
  const sustainX = decayX + SEGMENT_WIDTH
  const releaseX = sustainX + SEGMENT_WIDTH

  // Points for the ADSR curve
  const points = $derived([
    { x: 0, y: 0 },                    // Start
    { x: attackX, y: 1 },              // Peak after attack
    { x: decayX, y: sustain },         // Sustain level after decay
    { x: sustainX, y: sustain },       // Hold sustain
    { x: releaseX, y: 0 }              // Back to 0 after release
  ])

  // Scale points to viewBox
  const scaledPoints = $derived(points.map(p => ({
    x: p.x * (1 - 2 * PADDING_X) + PADDING_X,
    y: (1 - p.y) * (HEIGHT - 2 * PADDING_Y) + PADDING_Y
  })))

  // Build SVG path
  const envelopePath = $derived([
    `M ${scaledPoints[0].x} ${scaledPoints[0].y}`,
    `L ${scaledPoints[1].x} ${scaledPoints[1].y}`,
    `L ${scaledPoints[2].x} ${scaledPoints[2].y}`,
    `L ${scaledPoints[3].x} ${scaledPoints[3].y}`,
    `L ${scaledPoints[4].x} ${scaledPoints[4].y}`
  ].join(' '))

  // Calculate current position indicator
  const currentPos = $derived((() => {
    if (currentPhase === 'idle' || currentPhase === 'fadeout' || fadeOpacity === 0) return null
    
    let baseX = 0
    let segmentWidth = SEGMENT_WIDTH
    
    switch (currentPhase) {
      case 'attack':
        baseX = 0
        break
      case 'decay':
        baseX = attackX
        break
      case 'sustain':
        baseX = decayX
        break
      case 'release':
        baseX = sustainX
        break
    }
    
    const x = (baseX + currentProgress * segmentWidth) * (1 - 2 * PADDING_X) + PADDING_X
    
    // Calculate Y based on phase
    let y = 0
    switch (currentPhase) {
      case 'attack':
        y = currentProgress
        break
      case 'decay':
        y = 1 - (1 - sustain) * currentProgress
        break
      case 'sustain':
        y = sustain
        break
      case 'release':
        y = sustain * (1 - currentProgress)
        break
    }
    
    return {
      x,
      y: (1 - y) * (HEIGHT - 2 * PADDING_Y) + PADDING_Y
    }
  })())

  // Calculate fill path for animation
  const fillPath = $derived((() => {
    if (currentPhase === 'idle' && fadeOpacity === 0) return null
    
    let fillPoints: Array<{x: number, y: number}> = []
    
    switch (currentPhase) {
      case 'fadeout':
        // Show full envelope during fadeout
        fillPoints = [
          scaledPoints[0],
          scaledPoints[1],
          scaledPoints[2],
          scaledPoints[3],
          scaledPoints[4]
        ]
        break
      case 'attack':
        if (!currentPos) return null
        fillPoints = [
          scaledPoints[0],
          { x: currentPos.x, y: currentPos.y }
        ]
        break
      case 'decay':
        if (!currentPos) return null
        fillPoints = [
          scaledPoints[0],
          scaledPoints[1],
          { x: currentPos.x, y: currentPos.y }
        ]
        break
      case 'sustain':
        if (!currentPos) return null
        fillPoints = [
          scaledPoints[0],
          scaledPoints[1],
          scaledPoints[2],
          { x: currentPos.x, y: currentPos.y }
        ]
        break
      case 'release':
        if (!currentPos) return null
        fillPoints = [
          scaledPoints[0],
          scaledPoints[1],
          scaledPoints[2],
          scaledPoints[3],
          { x: currentPos.x, y: currentPos.y }
        ]
        break
      default:
        return null
    }
    
    // Close the path at the bottom
    if (fillPoints.length === 0) return null
    
    const lastPoint = fillPoints[fillPoints.length - 1]
    const firstPoint = fillPoints[0]
    
    return [
      ...fillPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`),
      `L ${lastPoint.x} ${HEIGHT - PADDING_Y}`,
      `L ${firstPoint.x} ${HEIGHT - PADDING_Y}`,
      'Z'
    ].join(' ')
  })())

  const viewBoxWidth = releaseX + 2 * PADDING_X
  
  // Segment marker positions
  const markers = $derived([
    { x: scaledPoints[0].x, y: scaledPoints[0].y, label: '' }, // Start
    { x: scaledPoints[1].x, y: scaledPoints[1].y, label: '' }, // Attack peak
    { x: scaledPoints[2].x, y: scaledPoints[2].y, label: '' }, // Decay end
    { x: scaledPoints[3].x, y: scaledPoints[3].y, label: '' }, // Sustain end
    { x: scaledPoints[4].x, y: scaledPoints[4].y, label: '' }, // Release end
  ])
</script>

<div class="graph">
  <svg viewBox={`0 0 ${viewBoxWidth} ${HEIGHT}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:var(--color-module-accent);stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:var(--color-module-accent);stop-opacity:0.05" />
      </linearGradient>
    </defs>
    
    <!-- Fill under the envelope (animated) -->
    {#if fillPath}
      <path
        d={fillPath}
        fill="url(#fillGradient)"
        opacity={fadeOpacity}
      />
    {/if}
    
    <!-- ADSR envelope path -->
    <path
      d={envelopePath}
      fill="none"
      stroke-width="0.04"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke="var(--color-module-accent)"
      opacity="0.8"
    />
    
    <!-- Segment markers (dots on the line) -->
    {#each markers as marker}
      <circle
        cx={marker.x}
        cy={marker.y}
        r="0.025"
        fill="var(--color-module-accent)"
        opacity="0.6"
      />
    {/each}
    
    <!-- Current position indicator -->
    {#if currentPos}
      <circle
        cx={currentPos.x}
        cy={currentPos.y}
        r="0.05"
        fill="var(--color-module-accent)"
        stroke="var(--color-module-background)"
        stroke-width="0.015"
        opacity={fadeOpacity}
      />
    {/if}
  </svg>
</div>

<style>
  .graph {
    width: 100%;
    height: 100%;
  }
</style>
