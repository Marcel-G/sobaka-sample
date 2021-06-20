import { NoiseGeneratorNode } from "./noise.node";

export const startAudio = async () => {
  const context = new AudioContext();

  const noiseGenerator = await NoiseGeneratorNode.register(context);

  noiseGenerator.connect(context.destination)

  return context;
};
