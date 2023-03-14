<script lang="ts">
  export let size = '20px'
  export let thickness = '2px'
</script>

<div class="lds-ring" style="--size: {size}; --thickness: {thickness}">
  <div />
  <div />
  <div />
  <div />
</div>

<style>
  .lds-ring {
    display: block;
    position: relative;
    width: var(--size);
    height: var(--size);
  }
  .lds-ring div {
    box-sizing: border-box;
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    margin: var(--thickness);
    border: var(--thickness) solid var(--foreground);
    border-radius: 50%;
    animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    border-color: var(--foreground) transparent transparent transparent;
  }
  .lds-ring div:nth-child(1) {
    animation-delay: -0.45s;
  }
  .lds-ring div:nth-child(2) {
    animation-delay: -0.3s;
  }
  .lds-ring div:nth-child(3) {
    animation-delay: -0.15s;
  }
  @keyframes lds-ring {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
