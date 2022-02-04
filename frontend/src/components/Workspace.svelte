<style>
  .workspace {
    display: grid;
    grid-template-columns: repeat(auto-fill, 1.25rem);
    grid-template-rows: repeat(auto-fill, 1.25rem);
    position: fixed;
    inset: 0;
    gap: 0.5rem;
  }
</style>

<script lang="ts">
  import { onDestroy } from 'svelte'

  import { init } from '../state/global'

  const { persistant, cleanup } = init()

  export let id: string

  $: if (id == 'new') {
    const id = persistant.save()
    if (id) {
      history.pushState({}, '', `/workspace/${id}`)
    }
  } else {
    if (!persistant.load(id)) {
      console.error('Cannot load from file')
    } else {
      console.log('loading from file')
    }
  }

  onDestroy(cleanup)
</script>

<div class="workspace">
  <slot />
</div>
