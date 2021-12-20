<script lang="ts">
  import { SamplerNode } from 'sobaka-sample-web-audio'

  import { Router, Route, Link } from 'svelte-routing'
  import { onDestroy, onMount, setContext } from 'svelte'
  import { writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import { init_sampler } from './audio'

  import Toolbox from './components/Toolbox.svelte'
  import Wires from './components/Wires.svelte'
  import Workspace from './components/Workspace.svelte'
  import Clock from './modules/Clock.svelte'
  import Envelope from './modules/Envelope.svelte'
  import Oscillator from './modules/Oscillator.svelte'
  import Parameter from './modules/Parameter.svelte'
  import Sequencer from './modules/Sequencer.svelte'
  import Sink from './modules/Sink.svelte'
  import Volume from './modules/Volume.svelte'
  import Lfo from './modules/LFO.svelte'
  import modules from './state/modules'
  import type { Module } from './state/modules'
  import { MODULES } from './modules'

  let sampler: Writable<SamplerNode | null> = writable(null)
  setContext('sampler', sampler)

  function get_component(module: Module) {
    return {
      [MODULES.Clock]: Clock,
      [MODULES.Envelope]: Envelope,
      [MODULES.Oscillator]: Oscillator,
      [MODULES.Parameter]: Parameter,
      [MODULES.Sequencer]: Sequencer,
      [MODULES.Sink]: Sink,
      [MODULES.Volume]: Volume,
      [MODULES.Lfo]: Lfo
    }[module.type]
  }

  const module_list = modules.store()

  export let url = ''

  onMount(async () => {
    $sampler = await init_sampler()
  })

  onDestroy(() => {
    // @todo create destroy fn that will unload instance
    $sampler = null
  })
</script>

<Router {url}>
  <main>
    <Route path="/">
      Hello <Link to="/workspace/new">click here</Link> to begin
    </Route>
    <Route path="workspace/:id" let:params>
      {#if $sampler}
        <Toolbox />
        <Workspace id={params.id}>
          {#each $module_list as module (module.id)}
            <svelte:component
              this={get_component(module)}
              context={$sampler}
              id={module.id}
              initial_state={module.state}
              position={module.position}
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
