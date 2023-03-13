<script>
  import NavigationButton from './NavigationButton.svelte'
</script>

<nav class="navigation">
  <ul>
    <li>
      <slot name="left" />
    </li>
    <li>
      <slot name="mid" />
    </li>
    <li>
      <slot name="right">
        <a href="/workspace/draft/new">
          <NavigationButton>New</NavigationButton>
        </a>
      </slot>
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
  }

  .navigation li {
    display: flex;
    flex-basis: calc(100% / 3);
    margin: 0.5rem;
    align-items: center;
    gap: 0.5rem;
  }

  .navigation li:last-of-type {
    justify-content: end;
  }
</style>
