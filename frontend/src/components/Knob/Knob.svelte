<script context="module" lang="ts">
  import { Range } from '../../range/range'
</script>

<script lang="ts">
  import { from_normalised, to_normalised } from '../../range/range_functions'
  import Input from '../Input.svelte'
  import useDrag, { OnDrag, relative_to_element } from '../../actions/drag'
  import useWheel, { OnWheel } from '../../actions/wheel'
  import Dial from './Dial.svelte'

  export let value = 0.0
  export let range: Range
  export let label: string
  export let disabled = false
  export let orientation: 'ns' | 'ew' = 'ew'

  let focus_input: () => void

  $: normalised_value = to_normalised(range, value)

  let start_value = normalised_value
  const capture_start_value = () => {
    start_value = normalised_value
  }

  const handle_drag: OnDrag = (event, origin, element) => {
    const { y } = relative_to_element(event, origin, element)
    const scalar = event.shiftKey ? 0.1 : 1
    const delta = (-1 * scalar * y) / 250
    value = from_normalised(range, start_value + delta)
  }

  const handle_wheel: OnWheel = (_, position) => {
    value = from_normalised(range, start_value + position.y)
  }

  const handle_double_click = () => {
    focus_input()
  }
</script>

{#if disabled}
  <div
    class="knob"
    class:disabled
    class:ns={orientation === 'ns'}
    class:ew={orientation === 'ew'}
  >
    <slot name="knob-inputs" />
    <Dial {value} {range} {label} />
    <div class="input">
      <Input disabled bind:value {range} />
    </div>
  </div>
{:else}
  <div
    class="knob"
    class:disabled
    class:ns={orientation === 'ns'}
    class:ew={orientation === 'ew'}
    on:dblclick={handle_double_click}
    use:useDrag={{ onDrag: handle_drag, onDragStart: capture_start_value }}
    use:useWheel={{ onWheel: handle_wheel, onWheelStart: capture_start_value }}
  >
    <slot name="knob-inputs" />
    <Dial {value} {range} {label} />
    <div class="input">
      <Input bind:value bind:focus={focus_input} {range} />
    </div>
  </div>
{/if}

<style>
  .knob {
    display: grid;
    grid-template-columns: min-content min-content;

    position: relative;
    cursor: pointer;
  }

  .disabled.knob {
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
