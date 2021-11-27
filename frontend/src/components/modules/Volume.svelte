<script lang="ts">
	import { SamplerNode, Volume, VolumeInput } from "sobaka-sample-web-audio";
	import { getContext, onDestroy } from "svelte";
	import type { InputSocket, OutputSocket } from "../../patch";
	export let output: OutputSocket;
	export let level: InputSocket;
	export let signal: InputSocket;
	export let vc: InputSocket;

  const context: SamplerNode = getContext("sampler");
	const volume = new Volume(context);
	const loading = volume.create();

	loading
		.then((module_id) => {
			output?.(module_id);
			level?.(module_id, { Volume: VolumeInput.Level })
			signal?.(module_id, { Volume: VolumeInput.Signal })
			vc?.(module_id, { Volume: VolumeInput.Vc })
		})

	onDestroy(() => {
		volume.dispose();
	})
</script>

<div>
	{#await loading}
		<p>Loading...</p>
	{:then module_id} 
		<p>{module_id}</p>
	{/await}
</div>