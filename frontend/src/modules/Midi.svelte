<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }
</script>

<script lang="ts">
  import { WebMidi, Input } from 'webmidi'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Dropdown from '../components/Dropdown.svelte'
  import { matches } from 'lodash'
  import { Midi } from 'sobaka-sample-audio-worklet'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'

  let active_device_id: string
  let default_device: Input
  let inputs: Input[] = []

  const { context } = get_module_context()

  const midi = new Midi(context)

  $: {
    // Cleanup previous
    default_device?.removeListener('noteon')
    default_device?.removeListener('noteoff')

    // Attach new device
    default_device = inputs.find(matches({ id: active_device_id }))!
    default_device?.addListener('noteon', event => {
      midi.message({ NoteOn: event.note.number })
    })
    default_device?.addListener('noteoff', event => {
      midi.message({ NoteOff: event.note.number })
    })
  }

  onMount(async () => {
    await WebMidi.enable()
    inputs = WebMidi.inputs
    const [default_device] = inputs
    if (default_device) {
      active_device_id = default_device.id
    }
  })

  onDestroy(() => {
    // Cleanup previous
    default_device?.removeListener('noteon')
    default_device?.removeListener('noteoff')
    void midi.dispose()
  })
</script>

<Panel name="midi" height={4} width={7} custom_style={into_style(theme)}>
  <Dropdown options={inputs.map(input => input.id)} bind:selected={active_device_id} />

  <div slot="outputs">
    <Plug id={0} label="gate_1" type={PlugType.Output} for_module={midi} />
    <!-- @todo polyphony
      <Plug id={1} label="gate_2" type={PlugType.Output} for_module={midi} />
      <Plug id={2} label="gate_3" type={PlugType.Output} for_module={midi} />
      <Plug id={3} label="gate_4" type={PlugType.Output} for_module={midi} />
    -->
    <Plug id={1} label="pitch_1" type={PlugType.Output} for_module={midi} />
    <!-- @todo polyphony
      <Plug id={5} label="pitch_2" type={PlugType.Output} for_module={midi} />
      <Plug id={6} label="pitch_3" type={PlugType.Output} for_module={midi} />
      <Plug id={7} label="pitch_4" type={PlugType.Output} for_module={midi} />
    -->
  </div>
</Panel>
