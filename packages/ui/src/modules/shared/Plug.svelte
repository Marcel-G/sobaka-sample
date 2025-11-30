<script lang="ts">
  import { onDestroy } from 'svelte'
  import Tooltip from '../../components/Tooltip.svelte'
  import { twMerge } from 'tailwind-merge'
  import { PlugType } from '@sobaka/state/models/links'
  import type { RouteInfo } from '@sobaka/dsp';

  export let ctx: RouteInfo
  export let onClick: ((routeName: string) => void) | null = null
  export let registerElement: ((routeName: string, element: HTMLElement) => void) | null = null
  export let unregisterElement: ((routeName: string) => void) | null = null

  let element: HTMLElement

  const classes = {
    plug: 'cursor-pointer w-3 h-3 pointer-events-auto transition-colors duration-200 rounded-full bg-darker border-2 border-module-accent',
    hover: 'hover:border-zinc-900 dark:hover:border-zinc-100'
  }
  
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation()
    onClick?.(ctx.name)
  }
  
  $: if (registerElement && element) {
    requestAnimationFrame(() => {
      registerElement(ctx.name, element)
    })
  }
  
  onDestroy(() => {
    unregisterElement?.(ctx.name)
  })
</script>

<Tooltip label={ctx.label} position={ctx.type !== PlugType.Output ? 'left' : 'right'}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    role="button"
    data-kind="plug"
    tabindex="0"
    aria-label={ctx.label}
    class={twMerge(classes.plug, classes.hover)}
    bind:this={element}
    on:click={handleClick}
  ></div>
</Tooltip>
