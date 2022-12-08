<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import { WebMidi, Input } from 'webmidi'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Dropdown from '../components/Dropdown.svelte'
  import { matches } from 'lodash'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'

  let active_device_id: string
  let default_device: Input
  let inputs: Input[] = []
  let loading = true

  let note: ConstantSourceNode
  let gate: ConstantSourceNode

  const context = get_audio_context()

  const midi_volt = (pitch: number): number => pitch / 12

  onMount(async () => {
    note = new ConstantSourceNode($context)
    gate = new ConstantSourceNode($context)

    note.start()
    gate.start()

    loading = false
  })

  $: {
    // Cleanup previous
    default_device?.removeListener('noteon')
    default_device?.removeListener('noteoff')

    // Attach new device
    default_device = inputs.find(matches({ id: active_device_id }))!
    default_device?.addListener('noteon', event => {
      note?.offset.setValueAtTime(midi_volt(event.note.number), $context.currentTime)
      gate?.offset.setValueAtTime(1.0, $context.currentTime)
    })
    default_device?.addListener('noteoff', () => {
      gate?.offset.setValueAtTime(0.0, $context.currentTime)
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
  })
</script>

<Panel name="midi" height={4} width={7} custom_style={into_style(theme)}>
  <Dropdown options={inputs.map(input => input.id)} bind:selected={active_device_id} />

  <div slot="outputs">
    <Plug
      id={0}
      label="gate_1"
      ctx={{ type: PlugType.Output, connectIndex: 0, module: gate }}
    />
    <!-- @todo polyphony
      <Plug id={1} label="gate_2" type={PlugType.Output} for_module={midi} />
      <Plug id={2} label="gate_3" type={PlugType.Output} for_module={midi} />
      <Plug id={3} label="gate_4" type={PlugType.Output} for_module={midi} />
    -->
    <Plug
      id={1}
      label="pitch_1"
      ctx={{ type: PlugType.Output, connectIndex: 0, module: note }}
    />
    <!-- @todo polyphony
      <Plug id={5} label="pitch_2" type={PlugType.Output} for_module={midi} />
      <Plug id={6} label="pitch_3" type={PlugType.Output} for_module={midi} />
      <Plug id={7} label="pitch_4" type={PlugType.Output} for_module={midi} />
    -->
  </div>
</Panel>
