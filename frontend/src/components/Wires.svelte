<style>
  .wires {
    pointer-events: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;

    opacity: 0.5;
  }
</style>

<script lang="ts">
  import { derived } from 'svelte/store'
  import links from '../state/links'
  import type { Link } from '../state/links'
  import Wire from './Wire.svelte'
  import plug from '../state/plug'
  import type { PlugContext } from '../state/plug'

  const link_positions = derived([links.store(), plug.store()], ([links, plugs]) =>
    links
      .map(link => [plugs[link.to], plugs[link.from], link])
      .filter((link): link is [PlugContext, PlugContext, Required<Link>] =>
        link.every(Boolean)
      )
  )
</script>

<svg class="wires">
  {#each $link_positions as [from, to, link] (link.id)}
    <Wire
      on_click={() => {
        links.remove(link.id)
      }}
      {from}
      {to}
    />
  {/each}
</svg>
