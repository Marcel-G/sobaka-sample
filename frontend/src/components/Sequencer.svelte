<script lang="ts">
  // import { SamplerNode } from "sobaka-sample-web-audio";

  export let grid = [3, 16];

  $: col = `repeat(${grid[1]}, 1fr)`;
  $: row = `repeat(${grid[0]}, 1fr)`;

  $: is_active = Array(grid[0]).fill(0).map(_ => Array(grid[1]).fill(false));

  let mouse_down = false;

  function handle_mouse_down(i: number, j: number) {
    mouse_down = true;
    select(i, j);
  }

  function select(i: number, j: number) {
    if (mouse_down) {
      is_active[i][j] = !is_active[i][j];
    }
  }

  let context: AudioContext | null = null;

  async function handle_play() {
    // @todo importing SamplerNode breaks the build
    // if (!context) {
    //   const context = new AudioContext();

    //   const node = await SamplerNode.register(context);

    //   node.connect(context.destination);
    // } else {
    //   context.close();
    // }
  }
</script>

<svelte:window on:mouseup={() => { mouse_down = false }}/>

<div
  class="container"
  style="grid-template-rows: {row}; grid-template-columns: {col};"
>
  {#each { length: grid[0] } as _, i (i)}
    {#each { length: grid[1] } as _, j (j)}
      <div
        class:selected={is_active[i][j]}
        on:mousedown={() => handle_mouse_down(i, j)}
        on:mouseover={() => select(i, j)}
      />
    {/each}
  {/each}
</div>

<button on:click={() => handle_play()}>
  Play
</button>

<style>
  .container {
    width: 100%;
    display: grid;
    border: 1px solid #999;
    border-radius: 2px;
    grid-gap: 1px;
    background: #999;
  }

  .container div {
    background: #fff;
    cursor: pointer;
    padding-top: 200%;
  }

  div.selected {
    background: black;
  }
</style>
