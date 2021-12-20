<style>
  .toolbox {
    z-index: 100;
    position: relative;
  }
</style>

<script lang="ts">
  import { MODULES } from '../modules'
  import type { ModuleType } from '../modules'
  import modules from '../state/modules'

  function handle_create(module: ModuleType) {
    modules.create(module)
  }
</script>

<div class="toolbox">
  {#each Object.values(MODULES) as module}
    <button on:click={() => handle_create(module)}>{module}</button>
  {/each}
</div>
