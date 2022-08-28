<script context="module" lang="ts">
  export const title = writable<string>('')
</script>

<script lang="ts">
  import { page } from '$app/stores'
  import { writable } from '@crikey/stores-immer'
</script>

<nav class="navigation">
  <ul>
    <li>
      {#if $page.routeId !== ''}
        <a href="/">
          <button>Back</button>
        </a>
      {/if}
    </li>
    <li>
      {#if $page.routeId === 'workspace/[slug]'}
        <input
          on:keydown={event => {
            event.stopPropagation()
          }}
          bind:value={$title}
        />
      {/if}
    </li>
    <li>
      <a href="/workspace/new">
        <button>New</button>
      </a>
    </li>
  </ul>
</nav>

<style>
  .navigation {
    font-family: monospace;

    background-color: var(--current-line);
    width: 100vw;
    position: sticky;
    inset: 0 0 auto 0;
    z-index: 100;
  }
  .navigation ul {
    display: flex;
    list-style-type: none;
    justify-content: space-between;
  }

  .navigation li {
    margin: 0.5rem;
  }
  .navigation button {
    background-color: var(--purple-dark);
    color: var(--foreground);
    padding: 0.5rem;
    border-radius: 0.25rem;

    transition: background-color 0.25s;

    cursor: pointer;
  }
  .navigation button:hover {
    background-color: var(--purple);
  }

  input {
    text-align: center;
    display: block;
    color: var(--foreground);
    border-radius: 0.5rem;
    border: 2px solid transparent;
    width: 100%;
    padding: 0.5rem;
  }

  input:hover {
    border-color: var(--foreground);
  }

  input:focus {
    border-color: var(--cyan);
  }
</style>
