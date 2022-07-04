<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }
</script>

<script lang="ts">
  import { SampleAndHold } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
	import { PlugType } from '../state/plug';

  const { context } = get_module_context()

  const sample_and_hold = new SampleAndHold(context)

  const loading = sample_and_hold.get_address()

  onDestroy(() => {
    void sample_and_hold.dispose()
  })
</script>

<Panel name="S & H" height={4} width={4} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    🧿
  {/await}

	<div slot="inputs">
    <Plug id={0} label="Signal" type={PlugType.Input} for_module={sample_and_hold} />
    <Plug id={1} label="Gate" type={PlugType.Input} for_module={sample_and_hold} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={sample_and_hold} />
  </div>
</Panel>