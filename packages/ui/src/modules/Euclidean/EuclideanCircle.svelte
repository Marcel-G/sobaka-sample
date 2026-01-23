<script lang="ts">
  /**
   * EuclideanCircle - Circular visualization of a Euclidean rhythm pattern
   * 
   * Displays steps arranged in a circle with:
   * - Active steps (triggers) shown as filled circles
   * - Inactive steps shown as hollow circles
   * - Current step highlighted with a glow effect
   */

  interface EuclideanCircleProps {
    /** Total number of steps in the pattern */
    steps: number
    /** Pattern array - true for trigger, false for rest */
    pattern: boolean[]
    /** Current step position (0-indexed) */
    currentStep: number
    /** Size of the circle in pixels */
    size?: number
  }

  let {
    steps,
    pattern,
    currentStep,
    size = 80
  }: EuclideanCircleProps = $props()

  // Calculate positions for each step on the circle
  const getStepPosition = (index: number, totalSteps: number, radius: number) => {
    // Start from top (- PI/2) and go clockwise
    const angle = (index / totalSteps) * Math.PI * 2 - Math.PI / 2
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  }

  // Calculate step data for rendering
  const stepData = $derived.by(() => {
    const radius = (size / 2) - 10
    const center = size / 2
    
    return Array.from({ length: steps }, (_, i) => {
      const pos = getStepPosition(i, steps, radius)
      return {
        index: i,
        x: center + pos.x,
        y: center + pos.y,
        active: pattern[i] ?? false,
        isCurrent: i === currentStep
      }
    })
  })
</script>

<svg 
  width={size} 
  height={size} 
  viewBox={`0 0 ${size} ${size}`}
  class="euclidean-circle"
>
  <!-- Background circle track -->
  <circle
    cx={size / 2}
    cy={size / 2}
    r={(size / 2) - 10}
    fill="none"
    stroke="var(--color-dark)"
    stroke-width="1"
    opacity="0.5"
  />

  <!-- Step indicators -->
  {#each stepData as step}
    <!-- Current step glow -->
    {#if step.isCurrent}
      <circle
        cx={step.x}
        cy={step.y}
        r="10"
        fill="var(--color-module-accent)"
        opacity="0.3"
        class="glow"
      />
    {/if}
    
    <!-- Step circle -->
    <circle
      cx={step.x}
      cy={step.y}
      r={step.active ? 4 : 3}
      fill={step.active ? 'var(--color-module-accent)' : 'none'}
      stroke={step.active ? 'none' : 'var(--color-light)'}
      stroke-width="1.5"
      opacity={step.isCurrent ? 1 : (step.active ? 0.9 : 0.4)}
    />
    
    <!-- Current step indicator ring -->
    {#if step.isCurrent}
      <circle
        cx={step.x}
        cy={step.y}
        r="6"
        fill="none"
        stroke="var(--color-module-accent)"
        stroke-width="2"
      />
    {/if}
  {/each}
</svg>

<style>
  .euclidean-circle {
    display: block;
  }

  .glow {
    animation: pulse 0.1s ease-out;
  }

  @keyframes pulse {
    from {
      r: 4;
      opacity: 0.6;
    }
    to {
      r: 12;
      opacity: 0;
    }
  }
</style>
