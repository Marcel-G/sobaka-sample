<script context="module" lang="ts">
  import { type Range } from '../../range/range'
</script>

<script lang="ts">
  import { from_normalised, to_normalised } from '../../range/range_functions'
  import Input from '../Input.svelte'
  import useDrag, { type OnDrag, relative_to_element } from '../../actions/drag'
  import useWheel, { type OnWheel } from '../../actions/wheel'
  import Dial from './Dial.svelte'

  export let value = 0.0
  export let range: Range
  export let label: string
  export let disabled = false

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

  const classes = {
    group: 'flex flex-col items-center pointer-events-auto cursor-pointer',
    input: 'text-xs font-mono -mt-2',
    divider: 'border-l border-zinc-200 dark:border-zinc-900 h-2 m-1'
  }
</script>

{#if disabled}
  <div class={classes.group}>
    <Dial {value} {range} {label} />
    <div class={classes.input}>
      <Input disabled bind:value {range} />
    </div>
    {#if $$slots['knob-inputs']}
      <div class={classes.divider}></div>
    {/if}
    <slot name="knob-inputs" />
  </div>
{:else}
  <div
    role="slider"
    aria-valuenow={value}
    tabindex="0"
    class={classes.group}
    on:dblclick={handle_double_click}
    use:useDrag={{ onDrag: handle_drag, onDragStart: capture_start_value }}
    use:useWheel={{ onWheel: handle_wheel, onWheelStart: capture_start_value }}
  >
    <Dial {value} {range} {label} />
    <div class={classes.input}>
      <Input bind:value bind:focus={focus_input} {range} />
    </div>
    {#if $$slots['knob-inputs']}
      <div class={classes.divider}></div>
    {/if}
    <slot name="knob-inputs" />
  </div>
{/if}
