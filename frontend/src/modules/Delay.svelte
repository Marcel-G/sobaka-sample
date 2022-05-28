<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--purple)',
    background: 'var(--purple-dark)'
  }
</script>

<script lang="ts">
  import { Delay, Float, Param } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
	import Knob from '../components/Knob.svelte';
	import { PlugType } from '../state/plug';


  let name = 'delay'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let {time} = get_sub_state(name, { time: 0.5 })

  const delay = new Delay(context, { time })

  // Update the sobaka node when the state changes
  $: void delay.message(Param(0), [Float(time)])

  // Update the global state when state changes
  $: update_sub_state(name, { time })

  const loading = delay.get_address()

  onDestroy(() => {
    void delay.dispose()
  })
</script>

<Panel {name} height={6} width={5} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      <Knob bind:value={time} range={[0, 10]} />
    </div>
  {/await}
  <div slot="inputs">
    <Plug id={0} label="Input" type={PlugType.Input} for_module={delay} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={delay} />
  </div>
</Panel>