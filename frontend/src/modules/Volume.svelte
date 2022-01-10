<script lang="ts">
  import { SobakaContext, Volume, Parameter } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'

  interface State {
    level: Parameter['state']
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    level: { range: [0, 1], value: 0.5 }
  }

  const volume = new Volume(context)
  const level_param = new Parameter(context, initial_state.level)

  context.link(level_param, volume, Volume.Input.Level)

  const loading = volume.module_id

  modules.register(id, volume)

  const level = as_writable(level_param)

  $: modules.update(id, {
    level: $level
  })

  onDestroy(() => {
    void volume.dispose()
  })
</script>

<Panel name="vca" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob label="Frequency" bind:value={$level.value} bind:range={$level.range} />
  {/await}

  <div slot="inputs">
    <Plug {id} label="signal" for_input={Volume.Input.Signal} />

    <Plug {id} label="vc" for_input={Volume.Input.Vc} />
  </div>

  <div slot="outputs">
    <Plug {id} label="output" />
  </div>
</Panel>
