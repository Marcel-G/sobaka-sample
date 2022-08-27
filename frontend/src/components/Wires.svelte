<script lang="ts">
  import { get_workspace } from '../workspace/context'
  import Wire from './Wire.svelte'

  const space = get_workspace()

  const link_positions = space.get_link_positions()
</script>

<svg class="wires">
  {#each $link_positions as [from, to, link] (link.id)}
    <Wire
      on_click={() => {
        space.remove_link(link.id)
      }}
      {from}
      {to}
    />
  {/each}
</svg>

<style>
  .wires {
    pointer-events: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
