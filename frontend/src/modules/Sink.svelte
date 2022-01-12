<script lang="ts">
  import { SobakaContext, Sink } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext

  const sink = new Sink(context)

  const loading = sink.module_id

  onDestroy(() => {
    void sink.dispose()
  })
</script>

<Panel name="sink" {id} {position} height={2} width={2}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    🔊
  {/await}

  <div slot="inputs">
    <Plug {id} name="signal" for_module={sink} for_input={Sink.Input.Signal} />
  </div>
</Panel>
