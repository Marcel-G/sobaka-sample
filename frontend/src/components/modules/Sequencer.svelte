<script lang="ts">
	import { SamplerNode, Sequencer, SequencerInput } from "sobaka-sample-web-audio";
	import { getContext, onDestroy } from "svelte";
	import type { InputSocket, OutputSocket } from "../../patch";
	import { as_writable } from "../../writable_module";
	export let output: OutputSocket;
	export let gate: InputSocket;
  const context: SamplerNode = getContext("sampler");
	const sequencer = new Sequencer(context);
	const loading = sequencer.create({
		step: 0,
		sequence: [true, false, false, false]
	});

	loading
		.then((module_id) => {
			output?.(module_id);
			gate?.(module_id, { Sequencer: SequencerInput.Gate })
		})

	let state = as_writable(sequencer);

	function extend() {
		state.update((state) => ({
			...state,
			sequence: state.sequence.concat(state.sequence)
		}))
	}

	function toggle_index(i) {
		state.update((state) => ({
			...state,
			sequence: state.sequence.map((step, index) => i === index ? !step : step)
		}))
	}

	onDestroy(() => {
		sequencer.dispose();
	})
</script>

<div>
	{#if $state}
		<div class="sequence">
			{#each $state.sequence as step, i}
				<div
					class="step"
					class:selected={step}
					class:active={i === $state.step}
					on:click={() => toggle_index(i)}
				/>
			{/each}
		</div>
		<button on:click={extend}>
			extend
		</button>
	{:else}
		<p>Loading...</p>
	{/if}
</div>

<style>
.sequence {
	display: flex;
	justify-content: center;
}

.step {
	height: 2rem;
	width: 2rem;
	border: 1px solid black;
	cursor: pointer;
}
.step.active {
	background-color: pink;
}

.step.active.selected {
	background-color: red;
}

.step.selected {
	background-color: gainsboro;
}
</style>