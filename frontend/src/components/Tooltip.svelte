<script lang="ts">
  import { twMerge } from 'tailwind-merge'

  export let position: 'left' | 'right' = 'right'
  export let label: string

  const classes = {
    base: 'invisible absolute z-[1000] top-1/2 max-w-[120px] bg-zinc-900 text-zinc-200 text-center rounded-lg p-2 pointer-events-none group-hover:visible',
    arrow:
      "before:content-[''] before:absolute before:top-1/2 before:-mt-[5px] before:border-[5px] before:border-solid"
  }
  const positions = {
    left: 'right-full -translate-x-1 -translate-y-1/2 before:left-full before:border-transparent before:border-l-zinc-900',
    right:
      'left-full translate-x-1 -translate-y-1/2 before:right-full before:border-transparent before:border-r-zinc-900'
  }
</script>

<div class="relative flex font-mono lowercase pointer-events-all group">
  <slot />
  <span class={twMerge(classes.base, classes.arrow, positions[position])}>
    {label}
  </span>
</div>
