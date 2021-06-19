import { NoiseGeneratorNode } from "./noise.node";

export const startAudio = async () => {
  const context = new AudioContext();

  const modulator = new OscillatorNode(context);
  const modGain = new GainNode(context);

  const noiseGenerator = await NoiseGeneratorNode.register(context);

  noiseGenerator.connect(context.destination)

  // @ts-ignore
  const paramAmp = noiseGenerator.parameters.get("amplitude");
  modulator.connect(modGain).connect(paramAmp);

  modulator.frequency.value = 0.5;
  modGain.gain.value = 0.75;
  modulator.start();
};
