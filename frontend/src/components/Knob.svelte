<style>
  .wrapper {
    position: relative;
    margin: 0.125rem;
    pointer-events: none;
    flex: 1 1 auto;
    min-width: 45px;
  }
  .knob {
    position: relative;
    display: block;

    cursor: pointer;
    pointer-events: all;

    aspect-ratio: 1;

    padding: 0;
    border-radius: 50%;
    border: 2px solid var(--module-highlight);
    transform: rotate(calc(var(--rotation) * 1rad));
    background-color: var(--module-knob-background);
    transform-origin: 50% 50%;

    box-shadow: inset 0 0 10px var(--background);

    transition: border-color 0.25s;
  }

  .knob:hover {
    border-color: var(--foreground);
  }

  .knob::after {
    content: '';
    display: block;
    position: absolute;
    left: 50%;
    top: 4px;

    width: 3px;
    height: 0.5rem;

    border-radius: 1.5px;

    background-color: var(--module-highlight);
    transform: translateX(-50%);

    transition: background-color 0.25s;
  }

  .knob:hover:after {
    background-color: var(--foreground);
  }

  .inputs {
    position: absolute;
    bottom: -0.5rem;
    left: -0.5rem;
    pointer-events: all;
  }
  .direct-input {
    position: absolute;
    padding: 0.5rem;
    box-sizing: border-box;
    text-align: left;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: none;
    outline: none;
  }
</style>

<script lang="ts">
  import { throttle } from 'lodash'
  import Tooltip from './Tooltip.svelte'

  export let value = 0.0
  export let range: number[] = [0, 20000]
  export let label: string

  let [min, max] = range
  let rot_range = 2 * Math.PI * 0.83
  let pixel_range = 200
  let start_rotation = -Math.PI * 0.83
  let direct_input = false

  export let step = (max - min) / 100

  let start_y: number, start_value: number
  $: valueRange = max - min
  $: rotation = start_rotation + ((value - min) / valueRange) * rot_range

  function handle_direct_change(event: Event) {
    const target = event.target as HTMLInputElement
    const parsed = parseFloat(target.value)
    if (!isNaN(parsed)) {
      value = clamp(parsed, min, max)
    }
  }

  const handle_direct_change_throttle = throttle(handle_direct_change, 100)

  function clamp(num: number, min: number, max: number) {
    return Math.max(min, Math.min(num, max))
  }

  function pointerMove({ clientY }: PointerEvent) {
    const valueDiff = (valueRange * (clientY - start_y)) / pixel_range
    value = clamp(start_value - valueDiff, min, max)
  }

  function pointerDown({ clientY }: PointerEvent) {
    start_y = clientY
    start_value = value
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)
  }

  function pointerUp() {
    window.removeEventListener('pointermove', pointerMove)
    window.removeEventListener('pointerup', pointerUp)
  }
</script>

<div class="wrapper">
  <Tooltip {label}>
    <div
      class="knob"
      style="--rotation: {rotation}"
      on:dblclick={() => (direct_input = true)}
      on:pointerdown={pointerDown}
    />
  </Tooltip>

  <div class="inputs">
    <slot name="inputs" />
  </div>

  {#if direct_input}
    <input
      autofocus
      class="direct-input"
      {step}
      type="number"
      value={parseFloat(value.toFixed(3))}
      on:blur={() => (direct_input = false)}
      on:change={handle_direct_change_throttle}
    />
  {/if}
</div>
