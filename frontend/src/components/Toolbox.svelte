<style>
  .toolbox {
    z-index: 100;
    position: relative;
  }
</style>

<script lang="ts">
  import { ModuleUI } from '../modules'
  import modules from '../state/modules'

  function handle_create(type: ModuleUI) {
    modules.create(type)
  }
</script>

<div class="toolbox">
  {#each Object.values(ModuleUI) as module}
    <button on:click={() => handle_create(module)}>{module}</button>
  {/each}
</div>
