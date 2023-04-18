<script lang="ts">
  import useDrag, { OnDrag, relative_to_element } from '../../actions/drag'
  import useWheel, { OnWheel } from '../../actions/wheel'
  import type { Range } from '../../components/Knob/range'
  import {
    fromNormalised,
    toNormalised
  } from '../../components/Knob/range/rangeFunctions'

  export let range: Range
  export let value: number
  export let p0: number[]
  export let p1: number[]

  let start_value = toNormalised(range, value)
  const capture_start_value = () => {
    start_value = toNormalised(range, value)
  }

  const handle_drag: OnDrag = (event, origin, element) => {
    const { y } = relative_to_element(event, origin, element)
    const scalar = event.shiftKey ? 0.1 : 1
    const delta = (scalar * -y) / 250
    value = fromNormalised(range, start_value + delta)
  }

  const handle_wheel: OnWheel = (event, position) => {
    value = fromNormalised(range, start_value + position.y)
  }
</script>

<rect
  class="region"
  x={p0[0]}
  y={p0[1]}
  width={p1[0] - p0[0]}
  height={p1[1] - p0[1]}
  fill="transparent"
  use:useDrag={{ onDrag: handle_drag, onDragStart: capture_start_value }}
  use:useWheel={{ onWheel: handle_wheel, onWheelStart: capture_start_value }}
/>

<style>
  .region {
    cursor: ns-resize;
  }
</style>
