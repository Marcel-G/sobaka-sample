<script lang="ts">
  import { flatten } from 'lodash'
  import { onMount, onDestroy } from 'svelte'

  export let attack: number
  export let decay: number
  export let sustain: number
  export let release: number

  let anim_a_ref: SVGAnimateMotionElement
  let anim_d_ref: SVGAnimateMotionElement
  let anim_r_ref: SVGAnimateMotionElement

  let t = 0

  export const trigger_on = () => {
    t = anim_a_ref?.getCurrentTime() || 0
    anim_a_ref?.beginElement()
  }

  export const trigger_off = () => {
    anim_a_ref?.endElement()
    anim_r_ref?.beginElement()
  }

  const trigger_decay = () => {
    if (anim_a_ref?.getCurrentTime() - t > attack) {
      anim_d_ref?.beginElement()
    }
  }

  onMount(() => {
    anim_a_ref?.addEventListener('endEvent', trigger_decay)
  })

  onDestroy(() => {
    anim_a_ref?.removeEventListener('endEvent', trigger_decay)
  })

  $: p0 = [0, 1]
  $: p1 = [attack, 0]
  $: p2 = [p1[0] + decay, 1 - sustain]
  $: p3 = [p2[0] + release, 1]

  // scale
  $: s = ([x, y]: number[]) => [
    ((3 - 0.1) * x) / p3[0] + 0.05,
    ((1 - 0.1) * y) / p3[1] + 0.05
  ]

  $: full_path = flatten<string | number>([
    'M',
    s(p0),
    'L',
    s(p1),
    'L',
    s(p2),
    'L',
    s(p3)
  ]).join(' ')
  $: attack_path = flatten<string | number>(['M', s(p0), 'L', s(p1)]).join(' ')
  $: decay_path = flatten<string | number>(['M', s(p1), 'L', s(p2)]).join(' ')
  $: release_path = flatten<string | number>(['M', s(p2), 'L', s(p3)]).join(' ')
</script>

<div class="graph">
  <svg viewBox={`0 0 3 1`} width="100%" height="100%">
    <path
      d={full_path}
      fill="none"
      stroke-width="0.03"
      stroke-linecap="round"
      stroke="var(--module-highlight)"
    />
    <circle r="0.05" fill="var(--module-highlight)">
      <animateMotion
        bind:this={anim_a_ref}
        begin="indefinite"
        dur={`${attack}s`}
        path={attack_path}
      />
      <animateMotion
        bind:this={anim_d_ref}
        dur={`${decay}s`}
        fill="freeze"
        path={decay_path}
      />
      <animateMotion
        bind:this={anim_r_ref}
        begin="indefinite"
        dur={`${release}s`}
        fill="freeze"
        path={release_path}
      />
    </circle>
  </svg>
</div>

<style>
  .graph {
    flex: 1 1 100%;
  }
</style>
