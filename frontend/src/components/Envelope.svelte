<script lang="ts">
  import { onMount } from "svelte";

  export let data: number[];

  let canvas;
  const height = 128;

  onMount(() => {
    const ctx = canvas.getContext("2d");


    const min = Math.min(...data);
    const max = Math.max(...data);
    const scale = (height / (max - min));

    ctx.beginPath();
    data.forEach((y, x) => {
      ctx.rect(x, height / 2 - (y * scale), 1, y * scale * 2);
    });
    ctx.stroke();
  });
</script>

<canvas bind:this={canvas} width={data.length} height={height} />

<style>
  canvas {
    width: 100%;
    height: 100%;
  }
</style>
