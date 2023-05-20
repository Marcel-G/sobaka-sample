<script context="module" lang="ts">
  import { ChoiceRange } from './range/range'

  type ComponentData = {
    component: ComponentType
  }
</script>

<script lang="ts">
  import Arc from './Arc.svelte'
  import { fromNormalised, toNormalised } from './range/rangeFunctions'
  import useDrag, { OnDrag, relative_to_element } from '../../actions/drag'
  import useWheel, { OnWheel } from '../../actions/wheel'
  import Tooltip from '../Tooltip.svelte'
  import { ComponentType, SvelteComponent, SvelteComponentTyped } from 'svelte'

  export let value = 0.0
  export let range: ChoiceRange
  export let label: string
  export let orientation: 'ns' | 'ew' = 'ew'

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

  const get_angle = (i: number) => (((baseAngle * 2) / (range.choices.length - 1)) * i) - baseAngle

  const is_component = (data: unknown): data is ComponentData => data !== null && typeof data === 'object' && 'component' in data
</script>

<div
  class="switch"
  class:ns={orientation === 'ns'}
  class:ew={orientation === 'ew'}
  use:useDrag={{ onDrag: handle_drag, onDragStart: capture_start_value }}
  use:useWheel={{ onWheel: handle_wheel, onWheelStart: capture_start_value }}
>
  <div class="dial">
    <div class="labels">
      {#each range.choices as choice, i}
        <div class="label" style={`--angle: ${get_angle(i)}deg;`}>
          {#if is_component(choice.data)}
            <svelte:component this={choice.data.component} />
          {:else}
            {choice.label}
          {/if}
        </div>
      {/each}
    </div>
    <Tooltip {label}>
      <svg viewBox="0 0 100 100">
        <Arc
          x={50}
          y={50}
          radius={30}
          startAngle={-baseAngle}
          endAngle={baseAngle}
          stroke="var(--current-line)"
        />
        <Arc
          x={50}
          y={50}
          radius={30}
          startAngle={-baseAngle + baseAngle * 2 * normalised_value - 2}
          endAngle={-baseAngle + baseAngle * 2 * normalised_value + 2}
          stroke="var(--module-highlight)"
        />
      </svg>
    </Tooltip>
  </div>
</div>

<style>
  .switch {
    display: grid;
    grid-template-columns: min-content min-content;

    pointer-events: all;
    cursor: pointer;
    position: relative;
  }
  
  .labels {
    position: absolute;
    inset: 0;
    font-size: 0.75rem;
    font-family: monospace;
  }

  .label {
    --radius: 25px;
    --x: calc(50% - (var(--radius) * cos(var(--angle) + 90deg)));
    --y: calc(50% - (var(--radius) * sin(var(--angle) + 90deg)));
    left: var(--x);
    place-content: center;
    position: absolute;
    top: var(--y);

    height: 0.75rem;
    width: 0.75rem;

    fill: var(--module-foreground);
    stroke: var(--module-foreground);

    transform: translate(-50%, -50%);
  }

  .dial {
    position: relative;
    grid-row: 1;
    grid-column: 2;
  }

  svg {
    height: 3rem;
  }
</style>
