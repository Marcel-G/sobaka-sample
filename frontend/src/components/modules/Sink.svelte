<script lang="ts">
	import { SamplerNode, Sink, SinkInput } from "sobaka-sample-web-audio";
	import { getContext, onDestroy } from "svelte";
	import type { InputSocket, } from "../../patch";
	export let signal: InputSocket;
  const context: SamplerNode = getContext("sampler");
	const sink = new Sink(context);
	const loading = sink.create();

	loading
		.then((module_id) => {
			signal?.(module_id, { Sink: SinkInput.Signal });
		})

	onDestroy(() => {
		sink.dispose();
	})
</script>

<div>
	{#await loading}
		<p>Loading...</p>
	{:then module_id} 
		<p>{module_id}</p>
	{/await}
</div>