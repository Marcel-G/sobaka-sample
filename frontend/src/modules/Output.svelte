<style>
  .oscilloscope-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 0.5rem;
  }
</style>

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }
</script>

<script lang="ts">
  import { Output } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import Oscilloscope from '../components/Oscilloscope.svelte'
  import { PlugType } from '../state/plug'

  const { context } = get_module_context()

  const output = new Output(context)

  const loading = output.get_address()

  onDestroy(() => {
    void output.dispose()
  })
</script>

<Panel name="output" height={7} width={20} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="oscilloscope-wrapper">
      <Oscilloscope />
    </div>
  {/await}

  <div slot="inputs">
    <Plug id={0} label="l" type={PlugType.Input} for_module={output} />
    <Plug id={1} label="r" type={PlugType.Input} for_module={output} />
  </div>
</Panel>
