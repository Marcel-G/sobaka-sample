<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { get_context as get_audio_context, init_audio } from '../../audio'
  import Loading from '../../components/Loading.svelte'

  const audio = init_audio()
  const audio_context = get_audio_context()

  onMount(async () => {
    await audio.load()
  })

  onDestroy(() => {
    audio.cleanup()
  })
</script>

{#if $audio_context}
  <slot />
{:else}
  <Loading />
{/if}

<style>
  :global(main) {
    overflow-y: scroll;
  }
</style>
