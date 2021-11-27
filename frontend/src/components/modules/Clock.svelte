<script lang="ts">
import { Clock, Input, SamplerNode } from "sobaka-sample-web-audio";
import { getContext, onDestroy } from "svelte";
import type { InputSocket, OutputSocket } from "../../patch";
	export let output: OutputSocket;
	export let frequency: InputSocket;
  const context: SamplerNode = getContext("sampler");
	const clock = new Clock(context);
	const loading = clock.create();

	loading
		.then((module_id) => {
			output?.(module_id);
			frequency?.(module_id, { Clock: Input.Frequency })
		})

	onDestroy(() => {
		clock.dispose();
	})
</script>

<div>
	{#await loading}
		<p>Loading...</p>
	{:then module_id} 
		<p>{module_id}</p>
	{/await}
</div>