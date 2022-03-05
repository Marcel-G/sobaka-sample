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
  import { HACKMidi } from 'sobaka-sample-audio-worklet'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'

  let active_device_id: string
  let default_device: Input
  let inputs: Input[] = []

  const { context } = get_module_context()

  const midi_gate = new HACKMidi(context, 'Gate')
  const midi_note = new HACKMidi(context, 'Note')
  const midi_clock = new HACKMidi(context, 'Clock')

  $: {
    // Cleanup previous
    default_device?.removeListener('noteon')
    default_device?.removeListener('noteoff')
    default_device?.removeListener('clock')

    // Attach new device
    default_device = inputs.find(matches({ id: active_device_id }))!
    default_device?.addListener('noteon', event => {
      midi_gate.update({ NoteOn: { value: event.note.number } })
      midi_note.update({ NoteOn: { value: event.note.number } })
    })
    default_device?.addListener('noteoff', event => {
      midi_gate.update({ NoteOff: { value: event.note.number } })
      midi_note.update({ NoteOff: { value: event.note.number } })
    })
    default_device?.addListener('clock', event => {
      midi_gate.update('Clock')
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
    default_device?.removeListener('clock')
    void midi_gate.dispose()
    void midi_note.dispose()
    void midi_clock.dispose()
  })
</script>

<Panel name="midi" height={5} width={6} custom_style={into_style(theme)}>
  <Dropdown options={inputs.map(input => input.id)} bind:selected={active_device_id} />

  <div slot="outputs">
    <Plug name="output_clock" for_node={midi_clock} />
    <Plug name="output_gate" for_node={midi_gate} />
    <Plug name="output_note" for_node={midi_note} />
  </div>
</Panel>
