<script lang="ts">
  import flatten from 'lodash/flatten'

  export let attack: number
  export let release: number

  $: p0 = [0, 1]
  $: p1 = [attack, 0]
  $: p2 = [p1[0] + release, 1]

  // scale
  $: s = ([x, y]: number[]) => [
    ((3 - 0.1) * x) / p2[0] + 0.05,
    ((1 - 0.1) * y) / 1 + 0.05
  ]

  $: full_path = flatten<string | number>([
    'M',
    s(p0),
    'L',
    s(p1),
    'L',
    s(p2)
  ]).join(' ')
</script>

<div class="graph">
  <svg viewBox={`0 0 3 1`} width="100%" height="100%">
    <path
      d={full_path}
      fill="none"
      stroke-width="0.03"
      stroke-linecap="round"
      stroke="var(--color-module-accent)"
    />
  </svg>
</div>

<style>
  .graph {
    flex: 1 1 100%;
  }
</style>
