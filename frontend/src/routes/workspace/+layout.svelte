<script lang="ts">
  import { get_context as get_audio_context } from '../../audio'
  import Loading from '../../components/Loading.svelte'

  const audio_context = get_audio_context()
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
