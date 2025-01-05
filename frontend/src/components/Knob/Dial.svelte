<script context="module" lang="ts">
  import { type Range, RangeType } from '../../range/range'
</script>

<script lang="ts">
  import Arc from './Arc.svelte'
  import { to_normalised } from '../../range/range_functions'
  import Tooltip from '../Tooltip.svelte'

  export let value = 0.0
  export let range: Range
  export let label: string

  const baseAngle = 135

  $: normalised_value = to_normalised(range, value)
</script>

<div class="dial">
  <Tooltip {label}>
    <svg viewBox="0 0 100 100">
      <Arc
        x={50}
        y={50}
        radius={40}
        startAngle={-baseAngle}
        endAngle={baseAngle}
        stroke="var(--current-line)"
      />
      <Arc
        x={50}
        y={50}
        radius={40}
        startAngle={range.type === RangeType.Continuous && range.bipolar ? 0 : -baseAngle}
        endAngle={-baseAngle + baseAngle * 2 * normalised_value}
        stroke="var(--module-highlight)"
      />
    </svg>
  </Tooltip>
</div>

<style>
  .dial {
    grid-row: 1;
    grid-column: 2;
  }

  svg {
    height: 3rem;
  }
</style>
