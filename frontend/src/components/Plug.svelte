<script lang="ts">
	import type { InputTypeDTO, SamplerNode } from "sobaka-sample-web-audio";
	import { getContext, onDestroy } from "svelte";
	import { writable, Writable } from "svelte/store";
	import links, { Link } from "../state/links";

	export let id: string;
	export let label: string;
	export let to_type: InputTypeDTO = null;

	const move_context: EventTarget = getContext('move_context');

	const active_link = links.active_link_store()
  export const el: Writable<Element> = writable();

	function handle_click() {
		if (to_type === null) {
			active_link.update((link) => ({
				...link || {},
				from: id,
			}))
		} else {
			active_link.update((link) => ({
				...link || {},
				to: id,
				to_input_type: to_type
			}))	
		}
		
		if ($active_link.from && $active_link.to) {
			links.add($active_link as Link);
			active_link.set(null);
		}
	}

	function on_move() {
		el.update((element) => element);
	}

	move_context.addEventListener('move', on_move);

	onDestroy(() => {
		move_context.removeEventListener('move', on_move);
	})

</script>

<div
	role="button"
	aria-label={label}
	class="plug"
	on:click={() => handle_click()}
	bind:this={$el}
/>

<style>
	.plug {
		cursor: pointer;
		width: .75rem;
		height: .75rem;
		margin: .25rem;
		background-color: white;
		border: 3px solid pink;

		border-radius: 50%;
	}
</style>