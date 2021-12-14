<script lang="ts">
  import { ModuleType, SamplerNode } from 'sobaka-sample-web-audio';
  
  import { Router, Route } from "svelte-routing";
  import { onDestroy, onMount, setContext } from 'svelte';
  import { Writable, writable } from 'svelte/store';
  import { init_sampler } from './audio';

  import Toolbox from './components/Toolbox.svelte';
  import Wires from './components/Wires.svelte';
  import Workspace from './components/Workspace.svelte';
  import Clock from './modules/Clock.svelte';
  import Envelope from './modules/Envelope.svelte';
  import Oscillator from './modules/Oscillator.svelte';
  import Parameter from './modules/Parameter.svelte';
  import Sequencer from './modules/Sequencer.svelte'
  import Sink from './modules/Sink.svelte';
  import Volume from './modules/Volume.svelte';
  import modules, { Module } from './state/modules';

  let sampler: Writable<SamplerNode> = writable(null)
  setContext('sampler', sampler);

  function get_component(module: Module) {
    return {
      [ModuleType.Clock]: Clock,
      [ModuleType.Envelope]: Envelope,
      [ModuleType.Oscillator]: Oscillator,
      [ModuleType.Parameter]: Parameter,
      [ModuleType.Sequencer]: Sequencer,
      [ModuleType.Sink]: Sink,
      [ModuleType.Volume]: Volume,
    }[module.type]
  }

  const module_list = modules.store();

  export let url = "";

  onMount(async () => {
    $sampler = await init_sampler();
  })

  onDestroy(() => {
    // @todo create destroy fn that will unload instance
    $sampler = null;
  })
</script>

<Router url="{url}">
  <main>
    <Route path="/">
      
    </Route>
    <Route path="workspace/:id" let:params>
      {#if $sampler}
        <Toolbox />
        <Workspace id="{params.id}">
          {#each $module_list as module (module.id)}
            <svelte:component
              context={$sampler}
              id={module.id}
              initial_state={module.state}
              position={module.position}
              this={get_component(module)}
            />
          {/each}
          <Wires />
        </Workspace>
      {:else}
        Loading...
      {/if}
    </Route>
  </main>
</Router>