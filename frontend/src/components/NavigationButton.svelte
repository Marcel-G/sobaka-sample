<button>
  <slot />
</button>

<style>
  button {
    background-color: var(--purple-dark);
    color: var(--foreground);
    padding: 0.5rem;
    border-radius: 0.25rem;

    transition: background-color 0.25s;

    cursor: pointer;
  }
  button:hover {
    background-color: var(--purple);
  }
</style>
