<script lang="ts">
  import { twMerge } from 'tailwind-merge'

  export let on = false
</script>

<div
  class={twMerge(
    'h-2 w-2 m-1 rounded-full bg-red-900 transition-colors duration-200 ease-out',
    on && 'bg-red-500 duration-0'
  )}
></div>
