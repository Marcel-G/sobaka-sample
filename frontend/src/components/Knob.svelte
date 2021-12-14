<script lang="ts">
	import { throttle } from "../state/global";

	export let label: string
	export let value: number = 0.0
	export let range: [number, number] = [0, 20000]

	let [min, max] = range;
	let rot_range = 2 * Math.PI * 0.83;
	let pixel_range = 200;
	let start_rotation = -Math.PI * 0.83;
	let direct_input = false
	
	let start_y, start_value;
	$: valueRange = max - min;
	$: rotation = start_rotation + (value - min) / valueRange * rot_range;

	function handle_direct_change(event) {
		const parsed = parseFloat(event.target.value);
		if (parsed !== NaN) {
			value = clamp(parsed, min, max);
			console.log(value);
		}
	}

	const handle_direct_change_throttle = throttle(handle_direct_change, 100);
	
	function clamp(num, min, max) {
		return Math.max(min, Math.min(num, max));
	}
	
	function pointerMove({ clientY }) {
		const valueDiff = valueRange * (clientY - start_y) / pixel_range;
		value = clamp(start_value - valueDiff, min, max)
	}
	
	function pointerDown({ clientY }) {
		start_y = clientY;
		start_value = value;
		window.addEventListener('pointermove', pointerMove);
		window.addEventListener('pointerup', pointerUp);
	}
	
	function pointerUp() {
		window.removeEventListener('pointermove', pointerMove);
		window.removeEventListener('pointerup', pointerUp);
	}
</script>

<div class="wrapper">
	<div
		class="knob"
		style="--rotation: {rotation}"
		on:dblclick={() => direct_input = true}
		on:pointerdown={pointerDown}
	/>
	{#if direct_input}
		<input
			autofocus
			class="direct-input"
			step={(max - min) / 100}
			type="number"
			value={parseFloat(value.toFixed(3))}
			on:blur={() => direct_input = false}
			on:change={handle_direct_change_throttle}
		>
	{/if}
</div>

<style>
	
.wrapper {
	position: relative;
	margin: 0.5rem;
}
.knob {
	position: relative;
	display: block;

	aspect-ratio: 1;

	padding: 0;
	border-radius: 50%;
  transform: rotate(calc(var(--rotation) * 1rad));
  transform-origin: 50% 50%;

	border: 2px solid black;
}

.knob::after {
	content: ' ';
	display: block;
	position: absolute;
	left: 50%;
	top: 4px;

	width: 0.5rem;
	height: 0.5rem;

	border-radius: 50%;
	border: 1px solid black;
	background-color: black;
	transform: translateX(-50%);
}

.direct-input {
	position: absolute;
	padding: 0.5rem;
	box-sizing: border-box;
	text-align: left;
	top: 50%;
	transform: translateY(-50%);
	border: none;
	background: none;
	outline: none;
}
</style>

