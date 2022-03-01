<style>
  .workspace {
    display: grid;
    grid-template-columns: repeat(auto-fill, 0.5rem);
    grid-template-rows: repeat(auto-fill, 0.5rem);
    position: fixed;
    inset: 0;
    gap: 0.5rem;
  }
</style>

<script lang="ts">
  import { onDestroy } from 'svelte'

  import { init } from '../state/global'

  const { persistant, cleanup, set_current_id } = init()

  let loading = true

  export let id: string

  $: set_current_id(id)

  $: if (id == 'new') {
    persistant.save().then(new_id => {
      if (new_id) {
        set_current_id(new_id)
        history.pushState({}, '', `/workspace/${new_id}`)
        loading = false
      }
    })
  } else {
    persistant.load(id).then(loaded => {
      if (!loaded) {
        console.error('Cannot load from file')
      } else {
        console.log('loading from file')
      }
      loading = false
    })
  }

  onDestroy(cleanup)
</script>

<div class="workspace">
  {#if loading}
    Loading
  {:else}
    <slot />
  {/if}
</div>
