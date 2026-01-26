<script lang="ts">
  import Tooltip from '../../components/Tooltip.svelte'
  import { twMerge } from 'tailwind-merge'
  import { PlugType } from '@sobaka/state/models/links'
  import type { PlugProps } from '../../types/props'
  import { getConnectionContext } from '../../context/connection'

  let {
    ctx,
    onClick = null,
    bindElement = null
  }: PlugProps = $props()

  let element: HTMLElement

  // Get connection state from context - Plug checks its own status using ctx.name
  const connectionContext = getConnectionContext()
  const isPlugConnected = connectionContext?.isPlugConnected
  
  // Derive connected state reactively
  const connected = $derived($isPlugConnected?.(ctx.name) ?? false)

  const classes = {
    plug: 'cursor-pointer w-3 h-3 pointer-events-auto transition-colors duration-200 rounded-full bg-darker border-2 border-module-accent relative flex items-center justify-center',
    hover: 'hover:border-zinc-900 dark:hover:border-zinc-100',
    connected: 'w-1.5 h-1.5 rounded-full bg-orange'
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
  >
    {#if connected}
      <div class={classes.connected}></div>
    {/if}
  </div>
</Tooltip>
