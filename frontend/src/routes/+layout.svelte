<script lang="ts">
  import CssReset from '../components/CSSReset.svelte'
  import Theme from '../components/Theme.svelte'
</script>

<CssReset />
<Theme />
<nav class="navigation">
  <ul>
    <li>
      <a href="/workspace/new">
        <button>New</button>
      </a>
    </li>
    <li>
      <!-- <button on:click={handle_fork}> Fork </button> -->
    </li>
    <ul />
  </ul>
</nav>
<main>
  <slot />
</main>

<style>
  :global(html) {
    background-color: var(--background, initial);
    color: var(--foreground, initial);
  }

  .navigation {
    background-color: var(--current-line);
    width: 100vw;
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 100;
  }

  .navigation ul {
    display: flex;
    justify-content: flex-end;
    list-style-type: none;
  }

  .navigation button {
    background-color: var(--purple-dark);
    color: var(--foreground);
    padding: 0.5rem;
    margin: 0.5rem;
    border-radius: 0.25rem;

    font-family: monospace;

    transition: background-color 0.25s;

    cursor: pointer;
  }

  .navigation button:hover {
    background-color: var(--purple);
  }
</style>
