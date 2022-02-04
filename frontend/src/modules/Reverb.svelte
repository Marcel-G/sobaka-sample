<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;
  }
</style>

<script lang="ts">
  import { Reverb } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'

  const { context } = get_module_context()

  const reverb = new Reverb(context)

  const loading = reverb.node_id

  onDestroy(() => {
    void reverb.dispose()
  })
</script>

<Panel name="reverb" height={7} width={5}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <CvParameter
        for_node={reverb}
        for_input={Reverb.Input.Dampening}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={Reverb.Input.Dry}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={Reverb.Input.Wet}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={Reverb.Input.RoomSize}
        default_value={0.5}
        default_range={[0, 1]}
      />
      <CvParameter
        for_node={reverb}
        for_input={Reverb.Input.Width}
        default_value={0.5}
        default_range={[0, 1]}
      />
    </div>
  {/await}

  <div slot="inputs">
    <Plug for_node={reverb} for_input={Reverb.Input.Signal} />
  </div>

  <div slot="outputs">
    <Plug for_node={reverb} />
  </div>
</Panel>
