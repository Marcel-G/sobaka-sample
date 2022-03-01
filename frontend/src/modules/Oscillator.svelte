<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>

<script lang="ts">
  import { Oscillator } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Dropdown from '../components/Dropdown.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'

  let name = 'oscillator'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let { wave } = get_sub_state<Oscillator['state']>(name) || {
    wave: 'Sine'
  }

  const oscillator = new Oscillator(context, { wave })

  const loading = oscillator.node_id

  // Update the sobaka node when the state changes
  $: void oscillator.update({ wave })

  // Update the global state when state changes
  $: update_sub_state(name, { wave })

  onDestroy(() => {
    void oscillator.dispose()
  })
</script>

<Panel {name} height={8} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Dropdown options={['Saw', 'Sine', 'Square']} bind:selected={wave} />
    <CvParameter
      step={1 / 12}
      for_node={oscillator}
      for_input={'Frequency'}
      default_value={1}
      default_range={[0, 10]}
    />
  {/await}
  <div slot="outputs">
    <Plug name="output" for_node={oscillator} />
  </div>
</Panel>
