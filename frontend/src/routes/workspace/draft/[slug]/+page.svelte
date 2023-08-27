<script lang="ts">
  import type { PageData } from './$types'

  import Workspace from '../../../../workspace/Workspace.svelte'
  import Loading from '../../../../components/Loading.svelte'

  export let data: PageData

  $: store = data.workspace.init_store()
</script>

{#await store}
  <Loading />
{:then space} 
  <Workspace {space} />
{/await}
