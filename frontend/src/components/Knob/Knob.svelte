<script context="module" lang="ts">
  import { Range, RangeType } from './range/range'
</script>

<script lang="ts">
  import Arc from './Arc.svelte'
  import { fromNormalised, toNormalised } from './range/rangeFunctions'
  import Input from './Input.svelte'
  import useDrag, { OnDrag, relative_to_element } from '../../actions/drag'
  import useWheel, { OnWheel } from '../../actions/wheel'
  import Tooltip from '../Tooltip.svelte'

  export let value = 0.0
  export let range: Range
  export let label: string
  export let orientation: 'ns' | 'ew' = 'ew'

  let focus_input: () => void
  const baseAngle = 135

  $: normalised_value = toNormalised(range, value)

  let start_value = normalised_value
  const capture_start_value = () => {
    start_value = normalised_value
  }

  const handle_drag: OnDrag = (event, origin, element) => {
    const { y } = relative_to_element(event, origin, element)
    const scalar = event.shiftKey ? 0.1 : 1
    const delta = (-1 * scalar * y) / 250
    value = fromNormalised(range, start_value + delta)
  }

  const handle_wheel: OnWheel = (event, position) => {
    value = fromNormalised(range, start_value + position.y)
  }

  const handle_double_click = () => {
    focus_input()
  }
</script>

<div
  class="knob"
  class:ns={orientation === 'ns'}
  class:ew={orientation === 'ew'}
  on:dblclick={handle_double_click}
  use:useDrag={{ onDrag: handle_drag, onDragStart: capture_start_value }}
  use:useWheel={{ onWheel: handle_wheel, onWheelStart: capture_start_value }}
>
  <slot name="knob-inputs" />
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
          startAngle={range.type === RangeType.Continuous && range.bipolar
            ? 0
            : -baseAngle}
          endAngle={-baseAngle + baseAngle * 2 * normalised_value}
          stroke="var(--module-highlight)"
        />
      </svg>
    </Tooltip>
  </div>
  <div class="input">
    <Input bind:value bind:focus={focus_input} {range} />
  </div>
</div>

<style>
  .knob {
    display: grid;
    grid-template-columns: min-content min-content;

    pointer-events: all;
    cursor: pointer;
    position: relative;
  }

  .dial {
    grid-row: 1;
    grid-column: 2;
  }

  svg {
    height: 3rem;
  }

  .input {
    font-size: 0.75rem;
    font-family: monospace;
    margin-top: -0.5rem;
    grid-row: 2;
    grid-column: 2;
  }

  :global(.ns [slot='knob-inputs']) {
    grid-row: 3;
    grid-column: 2;
  }

  :global(.ns [slot='knob-inputs']::before) {
    content: '';
    border-left: 1px solid var(--foreground);
    display: block;
    height: 0.5rem;
    justify-self: center;
    margin: 0.25rem;
  }

  :global(.ns [slot='knob-inputs']) {
    align-self: center;
    display: grid;
    grid-template-columns: auto;
    justify-content: center;
  }

  :global(.ew [slot='knob-inputs']::after) {
    content: '';
    border-top: 1px solid var(--foreground);
    display: block;
    width: 0.5rem;
    align-self: center;
    margin: 0.25rem;
  }

  :global(.ew [slot='knob-inputs']) {
    align-self: center;
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
  }
</style>
