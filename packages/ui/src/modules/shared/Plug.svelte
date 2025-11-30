<script lang="ts">
  import { onDestroy } from 'svelte'
  import Tooltip from '../../components/Tooltip.svelte'
  import { twMerge } from 'tailwind-merge'
  import { PlugType } from '@sobaka/state/models/links'
  import type { PlugProps } from '../../types/props'

  let {
    ctx,
    onClick = null,
    registerElement = null,
    unregisterElement = null
  }: PlugProps = $props()

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
