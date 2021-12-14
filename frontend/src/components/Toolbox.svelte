<script lang="ts">
	import { ModuleType } from "sobaka-sample-web-audio";
	import modules from "../state/modules";

	const module_types: ModuleType[] = Object.values(ModuleType);

	function handle_create(module: ModuleType) {
		modules.create(module);
	}
</script>

<div class="toolbox">
	{#each module_types as module}
		<button on:click={() => handle_create(module)}>{module}</button>
	{/each}
</div>

<style>
	.toolbox {
		z-index: 100;
		position: relative;
	}
</style>
