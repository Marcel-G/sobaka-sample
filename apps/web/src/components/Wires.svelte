<script lang="ts">
  import { get_workspace } from '../context/workspace'
  import { roundCorners } from 'svg-round-corners'
  import { linker } from '../context/linker'
  import { derived, type Readable } from 'svelte/store'
  import { twMerge } from 'tailwind-merge'
  import type { Point } from '../context/positions'
  import {
    linkFinder,
    linkFinderCmp,
    memoizeLast,
    throttled
  } from '../context/linkFinder'
  import { is_fully_linked, plug_type, PlugType } from '@sobaka/state/models/links'
    import type { Position } from '@sobaka/state/models/workspace'

  export let mouse_position: Readable<Position>

  const { workspace } = get_workspace()

  const intoPath = (points: Point[]): string => {
    return points.reduce((acc, point, i) => {
      if (i === 0) {
        return `M ${point.x} ${point.y}`
      }
      return `${acc} L ${point.x} ${point.y}`
    }, '')
  }

  const plugPositions = workspace.positions.plugPositions
  const modulePositions = workspace.positions.modulePositions
  const partialLink = workspace.pending_link_store
  const links = workspace.links

  const activeLink = memoizeLast(
    derived([partialLink, plugPositions, mouse_position], ([l, p, mp]) =>
      linkFinder(l, p as Map<string, import('../context/positions').PlugPosition>, mp)
    ),
    linkFinderCmp
  )

  const paths = derived(
    throttled(
      derived([activeLink, links, plugPositions, modulePositions], stores => stores)
    ),
    ([activeLink, links, plugs, modules]) =>
      linker([...activeLink, ...links], plugs as Map<string, import('../context/positions').PlugPosition>, modules as Map<string, import('../context/positions').ModulePosition>)
  )

  function handle_click() {
    const [link] = $activeLink
    if ($partialLink && is_fully_linked(link)) {
      workspace.add_link(link)
      partialLink.set(null)
    }
  }
</script>

<svelte:window on:click={handle_click} />

<svg class="wires">
  {#each $paths as line (line.id)}
    <g>
      <!-- TODO: a11y, pointer events etc -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <path
        on:click={() => {
          workspace.remove_link(line.id!)
        }}
        class={twMerge(
          'pointer-events-auto',
          'cursor-pointer',
          'fill-none stroke-2',
          line.id === 'active-link' ? 'stroke-zinc-200' : 'stroke-orange'
        )}
        stroke-linecap="round"
        d={roundCorners(intoPath(line.path), 8).path}
      />
      <circle
        class={line.id === 'active-link' ? 'fill-zinc-200' : 'fill-orange'}
        cx={line.path.at(-1)!.x}
        cy={line.path.at(-1)!.y}
        r="3"
      />
      {#if plug_type(line.endId) === PlugType.Mixer}
        <polygon
          points={`
            ${line.path.at(0)!.x},${line.path.at(0)!.y - 5}
            ${line.path.at(0)!.x + 8},${line.path.at(0)!.y}
            ${line.path.at(0)!.x},${line.path.at(0)!.y + 5}
          `}
          class={line.id === 'active-link' ? 'fill-zinc-200' : 'fill-orange'}
        />
      {:else}
        <circle
          class={line.id === 'active-link' ? 'fill-zinc-200' : 'fill-orange'}
          cx={line.path.at(0)!.x}
          cy={line.path.at(0)!.y}
          r="3"
        />
      {/if}
    </g>
  {/each}
</svg>

<style>
  .wires {
    pointer-events: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
  }
</style>
