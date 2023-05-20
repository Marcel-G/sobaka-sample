<script context="module" lang="ts">
  import { ChoiceRange } from './range/range'
</script>

<script lang="ts">
  import Arc from './Arc.svelte'
  import { fromNormalised, toNormalised } from './range/rangeFunctions'
  import useDrag, { OnDrag, relative_to_element } from '../../actions/drag'
  import useWheel, { OnWheel } from '../../actions/wheel'
  import Tooltip from '../Tooltip.svelte'

  export let value = 0.0
  export let range: ChoiceRange
  export let label: string

  const baseAngle = 135 

  $: normalised_value = toNormalised(range, value)

  let start_value = normalised_value
  const capture_start_value = () => {
    start_value = normalised_value
  }

  const handle_drag: OnDrag = (event, origin, element) => {
    const { y } = relative_to_element(event, origin, element)
    const delta = (-1 * y) / 250
    value = fromNormalised(range, start_value + delta)
  }

  const handle_wheel: OnWheel = (event, position) => {
    value = fromNormalised(range, start_value + position.y)
  }
</script>

<div
  class="switch"
  use:useDrag={{ onDrag: handle_drag, onDragStart: capture_start_value }}
  use:useWheel={{ onWheel: handle_wheel, onWheelStart: capture_start_value }}
>
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
          startAngle={-baseAngle + baseAngle * 2 * normalised_value - 2}
          endAngle={-baseAngle + baseAngle * 2 * normalised_value + 2}
          stroke="var(--module-highlight)"
        />
      </svg>
    </Tooltip>
  </div>
  <div class="input">
    <slot name="value" />
  </div>
</div>

<style>
  .switch {
    pointer-events: all;
    cursor: pointer;
    position: relative;
  }
  
  .dial {
    position: relative;
    grid-row: 1;
    grid-column: 2;
  }

  .input {
    font-size: 0.75rem;
    font-family: monospace;
    margin-top: -0.5rem;
    grid-row: 2;
    grid-column: 2;
  }

  svg {
    height: 3rem;
  }
</style>
