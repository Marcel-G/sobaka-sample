<script context="module" lang="ts">
  import { type Range } from '../../range/range'
</script>

<script lang="ts">
  import { fromNormalised, toNormalised } from '../../range/rangeFunctions'
  import Input from '../Input.svelte'
  import useDrag, { type OnDrag, relativeToElement } from '../../actions/drag'
  import useWheel, { type OnWheel } from '../../actions/wheel'
  import Dial from './Dial.svelte'

  export let value = 0.0
  export let range: Range
  export let label: string
  export let disabled = false

  let focusInput: () => void

  $: normalisedValue = toNormalised(range, value)

  let startValue = normalisedValue
  const captureStartValue = () => {
    startValue = normalisedValue
  }

  const handleDrag: OnDrag = (event, origin, element) => {
    const { y } = relativeToElement(event, origin, element)
    const scalar = event.shiftKey ? 0.1 : 1
    const delta = (-1 * scalar * y) / 250
    value = fromNormalised(range, startValue + delta)
  }

  const handleWheel: OnWheel = (_, position) => {
    value = fromNormalised(range, startValue + position.y)
  }

  const handleDoubleClick = () => {
    focusInput()
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
    on:dblclick={handleDoubleClick}
    use:useDrag={{ onDrag: handleDrag, onDragStart: captureStartValue }}
    use:useWheel={{ onWheel: handleWheel, onWheelStart: captureStartValue }}
  >
    <Dial {value} {range} {label} />
    <div class={classes.input}>
      <Input bind:value bind:focus={focusInput} {range} />
    </div>
    {#if $$slots['knob-inputs']}
      <div class={classes.divider}></div>
    {/if}
    <slot name="knob-inputs" />
  </div>
{/if}
