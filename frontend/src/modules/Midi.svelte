<script lang="ts">
	import { WebMidi, Input } from 'webmidi';
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
	import Dropdown from '../components/Dropdown.svelte';
	import { matches } from 'lodash';
	import { HACKMidi } from 'sobaka-sample-audio-worklet';
	import Plug from './shared/Plug.svelte';

	let active_device_id: string;
	let default_device: Input;
	let inputs: Input[] = []
	
  const { context } = get_module_context()

  const midi_gate = new HACKMidi(context, 'Gate')
  const midi_note = new HACKMidi(context, 'Note')

	$: {
		// Cleanup previous
		default_device?.removeListener('noteon')
		default_device?.removeListener('noteoff')

		// Attach new device
		default_device = inputs.find(matches({ id: active_device_id }))!
		default_device?.addListener('noteon', (event) => {
			midi_gate.update({ 'NoteOn': { value: event.note.number }})
			midi_note.update({ 'NoteOn': { value: event.note.number }})

		})
		default_device?.addListener('noteoff', (event) => {
			midi_gate.update({ 'NoteOff': { value: event.note.number }})
			midi_note.update({ 'NoteOff': { value: event.note.number }})
		})
	};


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
    void midi_gate.dispose()
    void midi_note.dispose()
	})

</script>

<Panel name="midi" height={2} width={4}>
	<Dropdown
		options={inputs.map((input) => input.id)}
		bind:selected={active_device_id}
	/>

  <div slot="outputs">
    <Plug name="output_gate" for_node={midi_gate} />
    <Plug name="output_note" for_node={midi_note} />
  </div>
</Panel>
