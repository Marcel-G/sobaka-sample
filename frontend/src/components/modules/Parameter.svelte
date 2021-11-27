<script lang="ts">
	import { Parameter, SamplerNode } from "sobaka-sample-web-audio";
	import { getContext, onDestroy } from "svelte";
	import type { OutputSocket } from "../../patch";
	import { as_writable } from "../../writable_module";
	export let output: OutputSocket;
	export let label: string
	export let initial_value: number = 0.0
	export let range: [number, number] = [0, 20000]
  const context: SamplerNode = getContext("sampler");
	const parameter = new Parameter(context);
	const loading = parameter.create({ range, value: initial_value });

	loading
		.then((module_id) => {
			output?.(module_id);
		})

	let state = as_writable(parameter);

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

<div>
	{#if $state}
		<span>
			{label}
			<input
				type="number"
				value={$state.value}
				on:change={handle_change}
			>
		</span>
	{:else}
		<p>Loading...</p>
	{/if}
</div>