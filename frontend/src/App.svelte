<style>
  :global(html) {
    background-color: var(--background, initial);
    color: var(--foreground, initial);
  }
</style>

<script lang="ts">
  import { SobakaContext } from 'sobaka-sample-audio-worklet'

  import { Router, Route, Link } from 'svelte-routing'
  import { onDestroy, onMount, setContext } from 'svelte'
  import { get, writable } from 'svelte/store'
  import type { Writable } from 'svelte/store'
  import { init_sampler } from './audio'

  import Wires from './components/Wires.svelte'
  import Workspace from './components/Workspace.svelte'
  import modules from './state/modules'
  import ModuleWrapper from './modules/ModuleWrapper.svelte'
  import Theme from './components/Theme.svelte'
  import CssReset from './components/CSSReset.svelte'

  let sampler: Writable<SobakaContext | null> = writable(null)
  setContext('sampler', sampler)

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

<CssReset />
<Theme />
<Router {url}>
  <main>
    <Route path="/">
      Hello <Link to="/workspace/new">click here</Link> to begin
    </Route>
    <Route path="workspace/:id" let:params>
      {#if $sampler}
        <Workspace id={params.id}>
          {#each $module_list as module (module.id)}
            <ModuleWrapper {module} context={$sampler} />
          {/each}
          <Wires />
        </Workspace>
      {:else}
        Loading...
      {/if}
    </Route>
  </main>
</Router>
