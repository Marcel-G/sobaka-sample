<script lang="ts">
	import { Input, Oscillator, OscillatorWave, SamplerNode } from "sobaka-sample-web-audio";
	import { getContext, onDestroy } from "svelte";
	import type { InputSocket, OutputSocket } from "../../patch";
	import { as_writable } from "../../writable_module";
	export let output: OutputSocket;
	export let frequency: InputSocket;

  const context: SamplerNode = getContext("sampler");
	const oscillator = new Oscillator(context);
	const loading = oscillator.create();

	loading
		.then((module_id) => {
			output?.(module_id);
			frequency?.(module_id, { Oscillator: Input.Frequency });
		})

	const state = as_writable(oscillator);

	function change_wave(wave: OscillatorWave) {
		state.set({ wave })
	}

	onDestroy(() => {
		oscillator.dispose();
	})
</script>

<div>
	{#await loading}
		<p>Loading...</p>
	{:then module_id}
		<button on:click={() => change_wave(OscillatorWave.Sine)}>Sine</button>
		<button on:click={() => change_wave(OscillatorWave.Saw)}>Saw</button>
		<button on:click={() => change_wave(OscillatorWave.Square)}>Square</button>
		<button on:click={() => change_wave(OscillatorWave.Noise)}>Noise</button>
		<p>{module_id} wave: {$state?.wave}</p>
	{/await}
</div>