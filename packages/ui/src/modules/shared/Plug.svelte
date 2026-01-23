<script lang="ts">
  import { onDestroy } from 'svelte'
  import Tooltip from '../../components/Tooltip.svelte'
  import { twMerge } from 'tailwind-merge'
  import { PlugType } from '@sobaka/state/models/links'
  import type { PlugProps } from '../../types/props'

  let {
    ctx,
    onClick = null,
    bindElement = null
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
  
  // Bind element and get cleanup function
  $effect(() => {
    if (bindElement && element) {
      return bindElement(ctx.name, element)
    }
  })
</script>

<Tooltip label={ctx.label} position={ctx.type !== PlugType.Output ? 'left' : 'right'}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="button"
    data-kind="plug"
    tabindex="0"
    aria-label={ctx.label}
    class={twMerge(classes.plug, classes.hover)}
    bind:this={element}
    onclick={handleClick}
    onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
  ></div>
</Tooltip>
