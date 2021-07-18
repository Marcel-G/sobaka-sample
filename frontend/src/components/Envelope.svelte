<script lang="ts">
  import { onMount } from "svelte";

  export let data: number[];

  let canvas;
  const height = 128;

  onMount(() => {
    const ctx = canvas.getContext("2d");


    const min = Math.min(...data);
    const max = Math.max(...data);
    const scale = (height / (max - min)) / 2;

    ctx.beginPath();
    ctx.translate(0.5, 0.5); // Translate to fix sub-pixel rounding canvas blur
    data.forEach((y, x) => {
      ctx.rect(x, height / 2 - (y * scale), 1, y * scale * 2);
    });
    ctx.translate(-0.5, -0.5); // Reset sub-pixel rounding canvas blur fix
    ctx.stroke();
  });
</script>

<canvas bind:this={canvas} width={data.length} height={height} />

<style>
  canvas {
    height: 100%;
    display: block;
  }
</style>
