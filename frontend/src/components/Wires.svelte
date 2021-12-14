<script lang="ts">
	import links, { Link } from "../state/links";
	import type { Module } from "../state/modules";
	import modules from "../state/modules";
	import Wire from "./Wire.svelte";
	
	const links_list =  links.store();

	$: link_positions = $links_list
		.map((link): [Module, Module, Link] => [
			modules.get_module(link.from),
			modules.get_module(link.to),
			link
		])
		.filter(([from, to]) =>
			from?.context &&
			to?.context
		)
</script>


<svg class="wires">
	{#each link_positions as [from, to, link] (`${link.from}-${link.to}-${link.to_input_type}`)}
		<Wire
			on_click={() => links.remove(link)}
			from={from.context.module_id}
			from_node={from.context.output_node}
			to={to.context.module_id}
			to_node={to.context.input_nodes[JSON.stringify(link.to_input_type)]}
			to_type={link.to_input_type}
		/>
	{/each}
</svg>

<style>
	.wires {
		pointer-events: none;
		position: absolute;
		inset: 0;
		width: 100%;
    height: 100%;

		opacity: 0.5;
	}
</style>