<script lang="ts">
	import { Parameter, SamplerNode } from "sobaka-sample-web-audio";
	import { onDestroy } from "svelte";
	import Panel from "../components/Panel.svelte";
	import Plug from "../components/Plug.svelte";
	import modules from "../state/modules";
	import { as_writable } from "../writable_module";

	interface State {
		parameter: { range: [number, number], value: number }
	}

	export let label: string
	export let initial_state: State = {
		parameter: { range: [0, 1], value: 0.0 },
	}

	// @todo make context
	export let id: string;
	export let position: { x: number, y: number };
  export let context: SamplerNode;

	let output_node;

	const parameter = new Parameter(context);
	const loading = parameter.create(initial_state.parameter);

	loading
		.then((module_id) =>
			modules.register(id, {
				module_id: module_id,
				output_node: output_node,
				input_nodes: {}
			})
		)

	let state = as_writable(parameter, initial_state.parameter);

	$: modules.update(id, {
		parameter: $state
	})

	function handle_change(event) {
		state.update((state) => ({
			...state,
			value: parseFloat(event.target.value)
		}))
	}

	onDestroy(() => {
		parameter.dispose();
	})
</script>

<Panel
	name="parameter"
	id={id}
	position={position}
	height={5}
	width={5}
>
	{#if $state}
		<span>
			{label}
			<input
				type="number"
				value={$state.value}
				on:change={handle_change}
			>
		</span>
		<Plug
			id={id}
			label="output"
			bind:el={output_node}
		/>
	{:else}
		<p>Loading...</p>
	{/if}
</Panel>