<script lang="ts">
  import Tooltip from '../../components/Tooltip.svelte'
  import { twMerge } from 'tailwind-merge'
  import { PlugType } from '@sobaka/state/models/links'
  import type { RouteInfo } from '@sobaka/dsp';

  export let ctx: RouteInfo
  export let moduleId: string
  export let onClick: ((moduleId: string, routeName: string) => void) | null = null

  let element: HTMLElement

  const classes = {
    plug: 'cursor-pointer w-3 h-3 pointer-events-auto transition-colors duration-200 rounded-full bg-darker border-2 border-module-accent',
    hover: 'hover:border-zinc-900 dark:hover:border-zinc-100'
  }
  
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation()
    onClick?.(moduleId, ctx.name)
  }
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
