<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    pointer-events: none;
  }
</style>

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)'
  }
</script>

<script lang="ts">
  import { Filter } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Dropdown from '../components/Dropdown.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let name = 'filter'

  let { kind } = get_sub_state<Filter['state']>(name) || { kind: 'BandPass' }

  const filter = new Filter(context, { kind })

  // Update the sobaka node when the state changes
  $: void filter.update({ kind })

  // Update the global state when state changes
  $: update_sub_state(name, { kind })

  const loading = filter.node_id

  onDestroy(() => {
    void filter.dispose()
  })
</script>

<Panel name="filter" height={4} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Dropdown
      options={['HighPass', 'LowPass', 'BandPass', 'Peak']}
      bind:selected={kind}
    />
    <div class="controls">
      <CvParameter
        for_node={filter}
        for_input={'Frequency'}
        default_value={1}
        default_range={[0, 10]}
      />
      <CvParameter
        for_node={filter}
        for_input={'Q'}
        default_value={0.5}
        default_range={[0, 1]}
      />
    </div>
  {/await}

  <div slot="inputs">
    <Plug for_node={filter} for_input={'Signal'} />
  </div>

  <div slot="outputs">
    <Plug for_node={filter} />
  </div>
</Panel>
