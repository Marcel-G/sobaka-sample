<script lang="ts">
	import { Envelope, EnvelopeInput, Parameter, SamplerNode } from "sobaka-sample-web-audio";
	import { getContext, onDestroy } from "svelte";
	import type { InputSocket, OutputSocket } from "../../patch";
	export let output: OutputSocket;
	export let gate: InputSocket;
	export let attack: InputSocket;
	export let decay: InputSocket;
	export let sustain: InputSocket;
	export let release: InputSocket;

  const context: SamplerNode = getContext("sampler");
	const envelope = new Envelope(context);
	const loading = envelope.create();

	loading
		.then((module_id) => {
			output?.(module_id);
			gate?.(module_id, { Envelope: EnvelopeInput.Gate });
			attack?.(module_id, { Envelope: EnvelopeInput.Attack });
			decay?.(module_id, { Envelope: EnvelopeInput.Decay });
			sustain?.(module_id, { Envelope: EnvelopeInput.Sustain });
			release?.(module_id, { Envelope: EnvelopeInput.Release });
		})

	onDestroy(() => {
		envelope.dispose();
	})
</script>

<div>
	{#await loading}
		<p>Loading...</p>
	{:then module_id} 
		<p>{module_id}</p>
	{/await}
</div>