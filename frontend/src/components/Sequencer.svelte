<script lang="ts">
  import type { SamplerNode } from "sobaka-sample-web-audio";
  import { setContext } from "svelte";
  import { patch } from "../patch";
  import Clock from "./modules/Clock.svelte";
  import Envelope from "./modules/Envelope.svelte";
  import Oscillator from "./modules/Oscillator.svelte";
  import Parameter from "./modules/Parameter.svelte";
  import Sequencer from "./modules/Sequencer.svelte";
  import Sink from "./modules/Sink.svelte";
  import Volume from "./modules/Volume.svelte";
  import Oscilloscope from "./Oscilloscope.svelte";

  export let sampler: SamplerNode;
  setContext("sampler", sampler);

  const [from_1, to_1] = patch(sampler);
  const [from_2, to_2] = patch(sampler);
  const [from_3, to_3] = patch(sampler);

  const [from_a, to_a] = patch(sampler);
  const [from_d, to_d] = patch(sampler);
  const [from_s, to_s] = patch(sampler);
  const [from_r, to_r] = patch(sampler);

  const [from_l, to_l] = patch(sampler);
  const [from_4, to_4] = patch(sampler);
  const [from_5, to_5] = patch(sampler);

  const [from_o, to_o] = patch(sampler);
  const [from_6, to_6] = patch(sampler);
</script>

<div>
  <div>
    <h3>-- Clock --</h3>
    <Parameter label="Frequency" initial_value={90} output={from_1} />
    <Clock frequency={to_1} output={from_2} />
  </div>

  <div>
    <h3>-- Sequencer --</h3>
    <Sequencer gate={to_2} output={from_3} />
  </div>

  <div>
    <h3>-- ADSR --</h3>
    <Parameter
      label="attack"
      initial_value={0.25}
      range={[0, 1]}
      output={from_a}
    />
    <Parameter
      label="decay"
      initial_value={0.1}
      range={[0, 1]}
      output={from_d}
    />
    <Parameter
      label="sustain"
      initial_value={0.25}
      range={[0, 1]}
      output={from_s}
    />
    <Parameter
      label="release"
      initial_value={0.4}
      range={[0, 1]}
      output={from_r}
    />

    <Envelope
      gate={to_3}
      attack={to_a}
      decay={to_d}
      sustain={to_s}
      release={to_r}
      output={from_4}
    />
  </div>

  <div>
    <h3>-- Osc --</h3>
    <Parameter label="frequency" initial_value={120} output={from_6} />
    <Oscillator frequency={to_6} output={from_5} />
  </div>

  <div>
    <h3>-- Volume --</h3>
    <Parameter
      label="level"
      initial_value={0.7}
      range={[0, 1]}
      output={from_l}
    />

    <Volume signal={to_5} vc={to_4} level={to_l} output={from_o} />
  </div>


  <Oscilloscope />
  <Sink signal={to_o} />
</div>
