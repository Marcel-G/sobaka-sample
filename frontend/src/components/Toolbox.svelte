<style>
  .toolbox {
    z-index: 100;
    position: absolute;

    border-radius: 0.5rem;

    width: 200px;

    font-family: monospace;

    background-color: var(--background);

    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -2px rgb(0 0 0 / 5%);

    overflow: hidden;
  }
  .list-wrapper {
    position: relative;
    z-index: -1;
  }

  .list-wrapper::before {
    pointer-events: none;
    content: '';
    position: absolute;
    top: -0.5rem;
    left: 0;
    right: 0;
    height: 1.25rem;
    background: linear-gradient(var(--background), transparent);
  }
  .list-wrapper::after {
    pointer-events: none;
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 0.75rem;
    background: linear-gradient(transparent, var(--background));
  }

  .list {
    max-height: 200px;
    overflow-y: scroll;
    padding: 0.25rem 0;
  }

  button:first-of-type {
    background-color: var(--comment);
  }

  button {
    display: block;
    color: var(--foreground);
    background-color: var(--current-line);
    /* border: 1px solid var(--foreground); */
    border-radius: 0.5rem;
    margin: 0.25rem 0;
    width: 100%;
    padding: 0.5rem;

    text-align: left;
  }

  button:hover {
    background-color: var(--comment);
  }

  input {
    display: block;
    color: var(--foreground);
    border: 2px solid var(--foreground);
    background-color: var(--background);
    border-radius: 0.5rem;
    width: 100%;
    padding: 0.5rem;
  }

  input:focus {
    border-color: var(--cyan);
  }
</style>

<script lang="ts">
  import { ModuleUI } from '../modules'
  import { into_grid_coords } from '../modules/shared/Panel.svelte'
  import modules from '../state/modules'

  export let position = { x: 0, y: 0 }
  export let onClose: () => void

  let search = ''

  const dumb_fuzzy =
    (query: string) =>
    (module_name: string): boolean => {
      if (!query.trim()) {
        return true
      }

      return module_name.toLowerCase().includes(query.trim().toLowerCase())
    }

  $: list = Object.values(ModuleUI).filter(dumb_fuzzy(search))

  function handle_create(type: ModuleUI) {
    modules.create(type, into_grid_coords(position))
    onClose()
  }

  const handle_key_down = (event: KeyboardEvent) => {
    if (event.code === 'Enter') {
      const [first] = list
      if (first) {
        handle_create(first)
      } else {
        onClose()
      }
    } else if (event.code === 'Escape') {
      onClose()
    }
  }
</script>

<div class="toolbox" style={`left: ${position.x}px; top: ${position.y}px`}>
  <input autofocus bind:value={search} on:keydown={handle_key_down} />
  <div class="list-wrapper">
    <div class="list">
      {#each list as module}
        <button on:click={() => handle_create(module)}>
          {module}
        </button>
      {/each}
    </div>
  </div>
</div>
