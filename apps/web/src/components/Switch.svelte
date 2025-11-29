<script context="module" lang="ts">
  import { type ChoiceRange } from '@sobaka/ui/range'
</script>

<script lang="ts">
  import { from_normalised, to_normalised } from '@sobaka/ui/range/range_functions'
  import useDrag, { type OnDrag, relative_to_element } from '../actions/drag'
  import useWheel, { type OnWheel } from '../actions/wheel'
  import Dial from './Knob/Dial.svelte'

  export let value = 0.0
  export let range: ChoiceRange
  export let label: string
  export let disabled = false

  $: normalised_value = to_normalised(range, value)

  let start_value = normalised_value
  const capture_start_value = () => {
    start_value = normalised_value
  }

  const handle_drag: OnDrag = (event, origin, element) => {
    const { y } = relative_to_element(event, origin, element)
    const delta = (-1 * y) / 250
    value = from_normalised(range, start_value + delta)
  }

  const handle_wheel: OnWheel = (_, position) => {
    value = from_normalised(range, start_value + position.y)
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
    use:useDrag={{ onDrag: handle_drag, onDragStart: capture_start_value }}
    use:useWheel={{ onWheel: handle_wheel, onWheelStart: capture_start_value }}
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
