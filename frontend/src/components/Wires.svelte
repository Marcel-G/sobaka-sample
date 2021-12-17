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

  import links, { Link } from '../state/links'
  import type { Module } from '../state/modules'
  import modules from '../state/modules'
  import Wire from './Wire.svelte'

  const links_list = links.store()

  const link_positions = derived(links_list, list =>
    list
      .map((link: Link): [Module, Module, Link] => [
        modules.get_module(link.from)!,
        modules.get_module(link.to)!,
        link
      ])
      .filter((link): link is [Required<Module>, Required<Module>, Link] => {
        const [from, to] = link
        return Boolean(from?.context && to?.context)
      })
  )
</script>

<svg class="wires">
  {#each $link_positions as [from, to, link] (`${link.from}-${link.to}-${link.to_input_type}`)}
    <Wire
      on_click={() => links.remove(link)}
      from={from.context}
      to={to.context}
      to_type={link.to_input_type}
    />
  {/each}
</svg>
