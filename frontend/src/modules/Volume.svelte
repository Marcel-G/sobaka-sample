<script lang="ts">
	import { SamplerNode, Volume, InputTypeDTO, Parameter, ParameterState, VolumeInput } from "sobaka-sample-web-audio";
	import { onDestroy } from "svelte";
	import Knob from "../components/Knob.svelte";
	import Panel from "../components/Panel.svelte";
	import Plug from "../components/Plug.svelte";
	import modules from "../state/modules";
	import { as_writable } from "../writable_module";

	interface State {
		level: { range: [number, number], value: number }
	}

	// @todo make context
	export let id: string;
	export let position: { x: number, y: number };
  export let context: SamplerNode;
	export let initial_state: State = {
		level: { range: [0, 1], value: 0.5 }
	}

	const vc_input_type = { Volume: VolumeInput.Vc };
	const signal_input_type = { Volume: VolumeInput.Signal };

	const volume = new Volume(context);
	const level_param = new Parameter(context);

	let output_node;
	let signal_node;
	let vc_node;

	const loading = Promise.all([
		volume.create(),
		level_param.create(initial_state.level)
	]).then(([volume_id, level_id]) => {
			modules.register(id, {
				module_id: volume_id,
				output_node: output_node,
				input_nodes: {
					[JSON.stringify(signal_input_type)]: signal_node,
					[JSON.stringify(vc_input_type)]: vc_node
				}
			})

			context.client.request({ // @todo move to binding lib
				method: 'module/connect',
				params: [level_id, volume_id, { Volume: VolumeInput.Level }]
			})
	})

	const level = as_writable(level_param, initial_state.level);

	$: modules.update(id, {
		level: $level
	})

	onDestroy(() => {
		volume.dispose();
	})
</script>

<Panel
	name="vca"
	id={id}
	position={position}
	height={3}
	width={3}
>
	{#await loading}
		<p>Loading...</p>
	{:then} 
		<Knob
			label="Frequency"
			bind:value={$level.value}
			bind:range={$level.range}
		/>
	{/await}

	<div slot="inputs">
		<Plug
			id={id}
			label="signal"
			to_type={signal_input_type}
			bind:el={signal_node}
		/>

		<Plug
			id={id}
			label="vc"
			to_type={vc_input_type}
			bind:el={vc_node}
		/>
	</div>

	<div slot="outputs">
		<Plug
			id={id}
			label="output"
			bind:el={output_node}
		/>
	</div>
</Panel>