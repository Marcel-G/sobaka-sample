<script lang="ts">
  import { persistant } from "../state/global";

  export let id: string;

  $: if (id == "new") {
    const id = persistant.save()
    history.pushState({}, '', `/workspace/${id}`)
  } else {
    if (!persistant.load(id)) {
      console.error('Cannot load from file')
    } else {
      console.log('loading from file')
    }
  }
</script>
<div class="workspace">
  <slot />
</div>

<style>
  .workspace {
    display: grid;
    grid-template-columns: repeat(auto-fill, 1.5rem);
    grid-template-rows: repeat(auto-fill, 1.5rem);
    position: fixed;
    inset: 0;
    gap: 0.5rem;
  }
</style>
