<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Knob from '../../components/Knob/Knob.svelte'
  import EuclideanCircle from './EuclideanCircle.svelte'
  import { RangeType, type ContinuousRange } from '../../range/range'
  import { EuclideanNode, computeEuclideanPattern, MAX_STEPS } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface EuclideanProps extends BaseModuleProps {
    node: EuclideanNode
  }

  let {
    node,
    disabled = false,
    position,
    onClose,
    onClone,
    onDrag,
    onPlugClick,
    bindPlugElement,
    bindElement
  }: EuclideanProps = $props()

  let name = node.name
  const nodeState = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  // Current step position from DSP
  let currentStep = $state(0)

  // Compute pattern on frontend (same algorithm as DSP)
  const pattern = $derived(
    computeEuclideanPattern($nodeState.steps, $nodeState.fills, $nodeState.rotation)
  )

  // Create ranges for the knobs
  const stepsRange: ContinuousRange = {
    type: RangeType.Continuous,
    start: 1,
    end: MAX_STEPS,
    step: 1,
    valueToString: (v) => `${Math.round(v)}`
  }

  // Fills range depends on current steps value
  const fillsRange = $derived<ContinuousRange>({
    type: RangeType.Continuous,
    start: 0,
    end: $nodeState.steps,
    step: 1,
    valueToString: (v) => `${Math.round(v)}`
  })

  // Rotation range depends on current steps value  
  const rotationRange = $derived<ContinuousRange>({
    type: RangeType.Continuous,
    start: 0,
    end: Math.max(0, $nodeState.steps - 1),
    step: 1,
    valueToString: (v) => `${Math.round(v)}`
  })

  // Listen for step events from DSP
  const handleStepEvent = (event: { step: number; triggered: boolean }) => {
    currentStep = event.step
  }

  onMount(() => {
    node.addStepListener(handleStepEvent)
  })

  onDestroy(() => {
    node.removeStepListener(handleStepEvent)
  })
</script>

<Panel
  {name}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={10}
  width={8}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  {#snippet children()}
    <div class="content">
      <div class="circle-container">
        <EuclideanCircle
          steps={$nodeState.steps}
          {pattern}
          {currentStep}
          size={100}
        />
      </div>
      <div class="knobs-wrapper">
        <div class="knobs">
          <Knob
            {disabled}
            bind:value={$nodeState.steps}
            range={stepsRange}
            label="len"
          />
          <Knob
            {disabled}
            bind:value={$nodeState.fills}
            range={fillsRange}
            label="fill"
          />
          <Knob
            {disabled}
            bind:value={$nodeState.rotation}
            range={rotationRange}
            label="rot"
          />
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.clock} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.reset} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}

  {#snippet outputs()}
    <Plug 
      ctx={routing.output} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}
</Panel>

<style>
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
  }

  .circle-container {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .knobs-wrapper {
    flex-shrink: 0;
    height: 2.75rem;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
  }

  .knobs {
    display: flex;
    gap: 0;
    transform: scale(0.6);
    transform-origin: top center;
  }
</style>
