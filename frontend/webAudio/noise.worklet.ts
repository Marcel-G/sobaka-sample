// @todo move this to rust for fun
const makeNoise = (
  inputs: Float32Array[][],
  outputs: Float32Array[][],
  parameters: Record<string, Float32Array>
) => {
  const output = outputs[0];
  const amplitude = parameters.amplitude;
  const isAmplitudeConstant = amplitude.length === 1;
  for (let channel = 0; channel < output.length; ++channel) {
    const outputChannel = output[channel];
    for (let i = 0; i < outputChannel.length; ++i) {
      outputChannel[i] =
        2 *
        (Math.random() - 0.5) *
        (isAmplitudeConstant ? amplitude[0] : amplitude[i]);
    }
  }
  return true;
};

class NoiseGenerator extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "amplitude", defaultValue: 0.25, minValue: 0, maxValue: 1 }
    ];
  }
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    return makeNoise(inputs, outputs, parameters);
  }
}

registerProcessor("noise-generator", NoiseGenerator);
