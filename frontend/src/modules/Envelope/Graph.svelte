<script lang="ts">
  import { scalar } from '../../components/Knob/Knob.svelte'
  import GraphRegion from './GraphRegion.svelte'

  const height = 100
  const width = 250

  export let attack = 0.3
  export let decay = 0.1
  export let sustain = 0.5
  export let release = 0.5

  $: p0 = [0, height]
  $: p1 = [attack * width, 0]
  $: p2 = [p1[0] + decay * width, height - sustain * height]
  $: p3 = [p2[0] + 50, height - sustain * height]
  $: p4 = [p3[0] + release * width, height]

  const create_curve = (a: number[], b: number[]) =>
    `M${a[0]},${a[1]} C${a[0]},${a[1] + (b[1] - a[1]) / 2} ${b[0] - (b[0] - a[0]) / 2},${
      b[1]
    } ${b[0]},${b[1]}`
</script>

<svg viewBox={`0 0 ${width} ${height}`}>
  <path
    d={create_curve(p0, p1)}
    fill="transparent"
    stroke-width="6"
    stroke-linecap="round"
    stroke="var(--module-highlight)"
  />
  <path
    d={create_curve(p1, p2)}
    fill="transparent"
    stroke-width="6"
    stroke-linecap="round"
    stroke="var(--module-highlight)"
  />
  <line
    x1={p2[0]}
    y1={p2[1]}
    x2={p3[0]}
    y2={p3[1]}
    stroke-width="6"
    stroke-linecap="round"
    stroke="var(--module-highlight)"
  />
  <path
    d={create_curve(p3, p4)}
    fill="transparent"
    stroke-width="6"
    stroke-linecap="round"
    stroke="var(--module-highlight)"
  />

  <GraphRegion p0={[0, 0]} p1={[p1[0], height]} bind:value={attack} range={scalar} />
  <GraphRegion p0={[p1[0], 0]} p1={[p2[0], height]} bind:value={decay} range={scalar} />
  <GraphRegion p0={[p2[0], 0]} p1={[p3[0], height]} bind:value={sustain} range={scalar} />
  <GraphRegion p0={[p3[0], 0]} p1={[p4[0], height]} bind:value={release} range={scalar} />
</svg>

<style>
  svg {
    overflow: visible;
    padding: 0.5rem;
    width: 100%;
    height: 100%;
  }
</style>
