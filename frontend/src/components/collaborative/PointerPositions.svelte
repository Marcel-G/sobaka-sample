<script lang="ts">
  import { get_workspace_context } from '../../workspace/context'
  const space = get_workspace_context()

  // const users = space.get_user_store()
</script>

<div>Todo mouse position</div>
<!-- <div class="mouse-position">
  {#each Object.values($users) as awareness (awareness.user.name)}
    {#if awareness.mouse}
      <div
        class={'dot'}
        style={`left: ${awareness.mouse.x}px; top: ${awareness.mouse.y}px;`}
      >
        {awareness.user.name}
      </div>
    {/if}
  {/each}
</div> -->

<style>
  .mouse-position {
    pointer-events: none;
    position: fixed;
    inset: 0;
    z-index: 10;
  }

  .dot {
    transition: left 0.25s, top 0.25s;
    position: absolute;
    width: 5px;
    height: 5px;
    background-color: red;
    border-radius: 50%;
  }
</style>
