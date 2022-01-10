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
  import type { ModuleContext } from '../state/modules'
  import modules from '../state/modules'
  import Wire from './Wire.svelte'
  import { ModuleType } from 'sobaka-sample-web-audio/dist/lib'

  const links_list = links.store()

  const link_positions = derived(links_list, list =>
    list
      .map((link: Link): [ModuleContext<ModuleType>, ModuleContext<ModuleType>, Link] => [
        modules.get_module(link.from)!.context!,
        modules.get_module(link.to)!.context!,
        link
      ])
      .filter(
        (
          link
        ): link is [
          Required<ModuleContext<ModuleType>>,
          Required<ModuleContext<ModuleType>>,
          Required<Link>
        ] => {
          const [from, to] = link
          return Boolean(from?.module && to?.module)
        }
      )
  )
</script>

<svg class="wires">
  {#each $link_positions as [from, to, link] (link.id)}
    <Wire
      on_click={() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        links.remove(link.id)
      }}
      {from}
      {to}
      to_input={link.to_input}
    />
  {/each}
</svg>
