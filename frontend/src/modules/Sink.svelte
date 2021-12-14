<script lang="ts">
	import { SamplerNode, Sink, SinkInput } from "sobaka-sample-web-audio";
	import { onDestroy } from "svelte";
	import Panel from "../components/Panel.svelte";
	import Plug from "../components/Plug.svelte";
	import modules from "../state/modules";

	// @todo make context
	export let id: string;
	export let position: { x: number, y: number };
  export let context: SamplerNode;

	const signal_input_type = { Sink: SinkInput.Signal };

	const sink = new Sink(context);
	const loading = sink.create();

	let signal_node;

	loading
		.then((module_id) =>
			modules.register(id, {
				module_id: module_id,
				output_node: undefined,
				input_nodes: {
					[JSON.stringify(signal_input_type)]: signal_node
				}
			})
		)

	onDestroy(() => {
		sink.dispose();
	})
</script>

<Panel
	name="sink"
	id={id}
	position={position}
	height={2}
	width={2}
>
	{#await loading}
		<p>Loading...</p>
	{:then}
		🔊
	{/await}

	<div slot="inputs">
		<Plug
			id={id}
			label="gate"
			to_type={signal_input_type}
			bind:el={signal_node}
		/>
	</div>
</Panel>