<script lang="ts">
  export let position: 'left' | 'right' = 'right'
  export let label: string
</script>

<div class="wrapper">
  <slot />
  <span
    class:left={position === 'left'}
    class:right={position === 'right'}
    class="tooltip"
  >
    {label}
  </span>
</div>

<style>
  .wrapper {
    position: relative;
    font-family: monospace;
    text-transform: lowercase;
  }

  .wrapper .tooltip {
    visibility: hidden;
    max-width: 120px;
    background-color: var(--current-line);
    color: var(--foreground);
    text-align: center;
    border-radius: 0.5rem;
    padding: 0.5rem;
    position: absolute;
    z-index: 1000;
    top: 50%;
  }

  .tooltip {
    pointer-events: none;
  }
  .tooltip.left {
    right: 100%;
    transform: translate(-0.25rem, -50%);
  }
  .tooltip.left::after {
    left: 100%;
    border-color: transparent transparent transparent var(--current-line);
  }

  .tooltip.right {
    left: 100%;
    transform: translate(0.25rem, -50%);
  }
  .tooltip.right::after {
    right: 100%;
    border-color: transparent var(--current-line) transparent transparent;
  }

  .wrapper .tooltip::after {
    content: '';
    position: absolute;
    top: 50%;
    margin-top: -5px;
    border-width: 5px;
    border-style: solid;
  }
  .wrapper:hover .tooltip {
    visibility: visible;
  }
</style>
