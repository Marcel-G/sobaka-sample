<script context="module" lang="ts">
  import { type ChoiceRange } from '../range/range'
</script>

<script lang="ts">
  import { fromNormalised, toNormalised } from '../range/range_functions'
  import useDrag, { type OnDrag, relativeToElement } from '../actions/drag'
  import useWheel, { type OnWheel } from '../actions/wheel'
  import Dial from './Knob/Dial.svelte'

  export let value = 0.0
  export let range: ChoiceRange
  export let label: string
  export let disabled = false

  $: normalisedValue = toNormalised(range, value)

  let startValue = normalisedValue
  const captureStartValue = () => {
    startValue = normalisedValue
  }

  const handleDrag: OnDrag = (event, origin, element) => {
    const { y } = relativeToElement(event, origin, element)
    const delta = (-1 * y) / 250
    value = fromNormalised(range, startValue + delta)
  }

  const handleWheel: OnWheel = (_, position) => {
    value = fromNormalised(range, startValue + position.y)
  }
</script>

{#if disabled}
  <div class="switch disabled">
    <Dial {value} {range} {label} />
    <div class="input">
      <slot name="value" />
    </div>
  </div>
{:else}
  <div
    class="switch"
    use:useDrag={{ onDrag: handleDrag, onDragStart: captureStartValue }}
    use:useWheel={{ onWheel: handleWheel, onWheelStart: captureStartValue }}
  >
    <Dial {value} {range} {label} />
    <div class="input">
      <slot name="value" />
    </div>
  </div>
{/if}

<style>
  .switch {
    pointer-events: all;
    cursor: pointer;
    position: relative;
  }

  .disabled.switch {
    pointer-events: none;
    cursor: initial;
  }

  .input {
    font-size: 0.75rem;
    font-family: monospace;
    margin-top: -0.5rem;
    grid-row: 2;
    grid-column: 2;
  }
</style>
