<script lang="ts">
  import { SobakaContext } from 'sobaka-sample-audio-worklet'

  import { Router, Route, Link } from 'svelte-routing'
  import { onDestroy, onMount, setContext } from 'svelte'
  import { get, writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import { init_sampler } from './audio'

  import Oscilloscope from './components/Oscilloscope.svelte'
  import Toolbox from './components/Toolbox.svelte'
  import Wires from './components/Wires.svelte'
  import Workspace from './components/Workspace.svelte'
  import Clock from './modules/Clock.svelte'
  import Envelope from './modules/Envelope.svelte'
  import Oscillator from './modules/Oscillator.svelte'
  import Parameter from './modules/Parameter.svelte'
  import MultiSequencer from './modules/MultiSequencer.svelte'
  import Sink from './modules/Sink.svelte'
  import Volume from './modules/Volume.svelte'
  import Lfo from './modules/LFO.svelte'
  import Delay from './modules/Delay.svelte'
  import modules from './state/modules'
  import type { Module } from './state/modules'
  import { ModuleUI } from './modules'

  let sampler: Writable<SobakaContext | null> = writable(null)
  setContext('sampler', sampler)

  function get_component(module: Module<ModuleUI>) {
    return {
      [ModuleUI.Clock]: Clock,
      [ModuleUI.Envelope]: Envelope,
      [ModuleUI.Oscillator]: Oscillator,
      [ModuleUI.Parameter]: Parameter,
      [ModuleUI.MultiSequencer]: MultiSequencer,
      [ModuleUI.Sink]: Sink,
      [ModuleUI.Vca]: Volume,
      [ModuleUI.Lfo]: Lfo,
      [ModuleUI.Delay]: Delay
    }[module.type]
  }

  const module_list = modules.store()

  export let url = ''

  onMount(async () => {
    $sampler = await init_sampler()
  })

  onDestroy(() => {
    void get(sampler)?.destroy()
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
        <Oscilloscope />
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
