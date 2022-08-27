<div class="container">
  <div class="spinner" />
  <div class="spinner" />
  <div class="spinner" />
</div>

<style>
  .container {
    display: flex;
    gap: 0.35rem;
  }

  .spinner {
    border-radius: 50%;
    box-shadow: inset 0 0 10px var(--background);
    height: 1rem;
    width: 1rem;

    animation: spinner-scale 2s infinite alternate ease-in-out;
  }
  .spinner:nth-child(1) {
    background: var(--pink);
  }
  .spinner:nth-child(2) {
    background: var(--purple);
  }
  .spinner:nth-child(3) {
    background: var(--yellow);
  }

  @keyframes spinner-scale {
    from {
      transform: scale(1);
      box-shadow: inset 0 0 10px var(--background);
    }
    to {
      transform: scale(1.25);
      box-shadow: inset 0 0 1px var(--background);
    }
  }
</style>
