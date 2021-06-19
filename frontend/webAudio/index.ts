import noiseGeneratorUrl from "worklet-loader!./noise.worklet.ts";

export const startAudio = async () => {
  const context = new AudioContext();
  await context.audioWorklet.addModule(noiseGeneratorUrl);
  const modulator = new OscillatorNode(context);
  const modGain = new GainNode(context);
  const noiseGenerator = new AudioWorkletNode(context, "noise-generator");
  noiseGenerator.connect(context.destination);

  // Connect the oscillator to 'amplitude' AudioParam.
  // @ts-ignore
  const paramAmp = noiseGenerator.parameters.get("amplitude");
  modulator.connect(modGain).connect(paramAmp);

  modulator.frequency.value = 0.5;
  modGain.gain.value = 0.75;
  modulator.start();
};
