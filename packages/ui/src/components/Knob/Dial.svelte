<script context="module" lang="ts">
  import { type Range, RangeType } from '../../range/range'

  export type KnobSize = 'small' | 'normal'
</script>

<script lang="ts">
  import Arc from './Arc.svelte'
  import { toNormalised } from '../../range/rangeFunctions'
  import Tooltip from '../Tooltip.svelte'

  export let value = 0.0
  export let range: Range
  export let label: string
  export let size: KnobSize = 'normal'

  const baseAngle = 135

  $: normalisedValue = toNormalised(range, value)
  $: sizeClass = size === 'small' ? 'h-8' : 'h-12'
</script>

<div class="row-start-1 col-start-2">
  <Tooltip {label}>
    <svg viewBox="0 0 100 100" class={sizeClass}>
      <Arc
        x={50}
        y={50}
        radius={40}
        startAngle={-baseAngle}
        endAngle={baseAngle}
        stroke-width="10"
        class="stroke-dark"
      />
      <Arc
        x={50}
        y={50}
        radius={40}
        stroke-width="12"
        startAngle={range.type === RangeType.Continuous && range.bipolar ? 0 : -baseAngle}
        endAngle={-baseAngle + baseAngle * 2 * normalisedValue}
        class="stroke-module-accent"
      />
    </svg>
  </Tooltip>
</div>
