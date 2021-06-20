import { SamplerNode } from "./sampler.node";

export const startAudio = async () => {
  const context = new AudioContext();

  const node = await SamplerNode.register(context);

  node.connect(context.destination)

  return context;
};
