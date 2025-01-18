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

<div class="row-start-1 col-start-2">
  <Tooltip {label}>
    <svg viewBox="0 0 100 100" class="h-12">
      <Arc
        x={50}
        y={50}
        radius={40}
        startAngle={-baseAngle}
        endAngle={baseAngle}
        class="stroke-zinc-500 dark:stroke-zinc-200"
      />
      <Arc
        x={50}
        y={50}
        radius={40}
        startAngle={range.type === RangeType.Continuous && range.bipolar ? 0 : -baseAngle}
        endAngle={-baseAngle + baseAngle * 2 * normalised_value}
        class="stroke-zinc-200 dark:stroke-zinc-900"
      />
    </svg>
  </Tooltip>
</div>
