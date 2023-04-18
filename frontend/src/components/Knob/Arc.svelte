<script lang="ts">
  /**
   * The X coordinate of the arc's center.
   */
  export let x: number

  /**
   * The Y coordinate of the arc's center.
   */
  export let y: number

  /**
   * The radius of the arc.
   */
  export let radius: number

  /**
   * The start angle of the arc in degrees.
   */
  export let startAngle: number

  /**
   * The end angle of the arc in degrees.
   */
  export let endAngle: number

  export let stroke: string | null | undefined = '#ccc'

  export let strokeWidth: string | number | null | undefined = 10

  // @todo -- how to do rest props for SVGPathElement

  // from: https://stackoverflow.com/a/18473154
  function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) {
    var angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    }
  }

  // from: https://stackoverflow.com/a/18473154
  function describeArc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): string {
    if (startAngle > endAngle) {
      let tmp = startAngle
      startAngle = endAngle
      endAngle = tmp
    }
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

    const d = [
      'M',
      start.x,
      start.y,
      'A',
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y
    ].join(' ')

    return d
  }
</script>

<path
  d={describeArc(x, y, radius, startAngle, endAngle)}
  fill="none"
  {stroke}
  stroke-width={strokeWidth}
/>
