<script context="module" lang="ts">
  import { Position } from '../@types'
  export const mouse_position = writable<Position>({ x: 0, y: 0 })
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import { get_workspace } from './context'

  import ModuleWrapper from '../modules/ModuleWrapper.svelte'
  import Toolbox from '../components/Toolbox.svelte'
  import Wires from '../components/Wires.svelte'
  import Navigation from '../components/Navigation.svelte'
  import TitleInput from '../components/TitleInput.svelte'
  import NavigationButton from '../components/NavigationButton.svelte'

  import PointerPositions from '../components/collaborative/PointerPositions.svelte'
  import AvatarList from '../components/collaborative/AvatarList.svelte'
    import Loading from '../components/Loading.svelte'
    import NetworkDebug from '../components/NetworkDebug.svelte'

  let toolbox_visible = false
  let toolbox_position: Position = { x: 0, y: 0 }
  let workspace_element: Element

  const space = get_workspace()

  onDestroy(() => {
    space.cleanup()
  })

  const store = space.store

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handle_double_click = (event: MouseEvent) => {
    $mouse_position = { x: event.offsetX, y: event.offsetY }
    toolbox_visible = true
    toolbox_position = $mouse_position
  }

  const handle_global_keydown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !toolbox_visible) {
      toolbox_visible = true
      toolbox_position = $mouse_position
    } else if (event.code === 'Escape') {
      const active_link = space.get_active_link_substore()
      active_link.update(() => null)
    }
  }

  const handle_mouse_move = (event: MouseEvent) => {
    const rect = workspace_element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    $mouse_position = { x, y }
  }

  const handle_close = () => {
    toolbox_visible = false
  }
</script>

<Navigation>
  <svelte:fragment slot="left">
    <a href="/">
      <NavigationButton>Back</NavigationButton>
    </a>
  </svelte:fragment>
  <svelte:fragment slot="mid">
    <TitleInput bind:value={$store.meta.title} />
  </svelte:fragment>
  <svelte:fragment slot="right">
    <AvatarList />
    <a
      href="#"
      on:click={() => {
        space.save_to_remote()
      }}
    >
      <NavigationButton>Save</NavigationButton>
    </a>
    <a href="/workspace/draft/new">
      <NavigationButton>New</NavigationButton>
    </a>
  </svelte:fragment>
</Navigation>

<svelte:window
  on:keydown={handle_global_keydown}
  on:wheel={handle_mouse_move}
  on:mousemove={handle_mouse_move}
/>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="workspace"
  on:click|self={handle_close}
  on:dblclick|self={handle_double_click}
  bind:this={workspace_element}
>
  <NetworkDebug />
  {#await space.load()}
    <Loading />
  {:then}
    {#if toolbox_visible}
      <Toolbox position={toolbox_position} onClose={handle_close} />
    {/if}

    {#each $store.modules as module (module.id)}
      <ModuleWrapper {module} />
    {/each}
    <PointerPositions />
    <Wires />
  {/await}
</div>

<style>
  .workspace {
    display: grid;
    grid-auto-rows: 0.5rem;
    grid-auto-columns: 0.5rem;
    gap: 0.5rem;
    min-width: max-content;
    min-height: 100vh;
    position: relative;

    padding-right: 5rem;
    padding-bottom: 5rem;

    background: conic-gradient(from 90deg at 1px 1px, #0000 90deg, var(--current-line) 0)
      0 0 / 1rem 1rem;
  }
</style>
