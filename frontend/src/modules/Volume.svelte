<script lang="ts">
  import { SobakaContext, Volume, Parameter } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'

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

  const loading = volume.node_id

  const level = writable(initial_state.level)

  $: {
    void level_param.update($level)
    modules.update(id, {
      level: $level
    })
  }

  onDestroy(() => {
    void volume.dispose()
  })
</script>

<Panel name="vca" {id} {position} height={3} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob bind:value={$level.value} bind:range={$level.range} />
  {/await}

  <div slot="inputs">
    <Plug {id} name="signal" for_module={volume} for_input={Volume.Input.Signal} />

    <Plug {id} name="cv" for_module={volume} for_input={Volume.Input.Vc} />
  </div>

  <div slot="outputs">
    <Plug {id} name="output" for_module={volume} />
  </div>
</Panel>
