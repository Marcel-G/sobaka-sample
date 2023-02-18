use enum_map::{Enum, EnumArray};
use fundsp::prelude::*;
use std::{convert::TryInto, fmt::Debug};
use waw::buffer::{AudioBuffer, Param, ParamBuffer};

pub struct FundspWorklet {
    pub inner: Au,
}

impl FundspWorklet {
    pub fn create<X: AudioNode<Sample = f32> + Send + 'static>(module: An<X>) -> Self {
        FundspWorklet {
            inner: Au::Unit32(Box::new(module)),
        }
    }

    pub fn process<P: EnumArray<Param> + Enum + Debug>(
        &mut self,
        audio: &mut AudioBuffer,
        params: &ParamBuffer<P>,
    ) {
        let (inputs, outputs) = audio.split();

        for i in 0..128 {
            // Write all the paramaters into the AudioUnit. Usually, these will be the same value.
            // Could possibly distinguish between a-rate / k-rate here
            for (param, buffer) in params.iter() {
                self.inner.set(
                    param.into_usize().try_into().unwrap(),
                    *buffer.as_ref().get(i).unwrap() as f64,
                );
            }

            let input_frame: Vec<_> = inputs
                .iter()
                // @todo hardcoded channel one - maybe flatten?
                .map(|channel| channel.channel(0).unwrap()[i])
                .collect();

            let mut output_frame = vec![0.0; outputs.len()]; // @todo assuming single channel

            assert!(
                input_frame.len() == self.inner.inputs(),
                "buffers = {}, inputs = {}",
                input_frame.len(),
                self.inner.inputs()
            );
            assert!(
                output_frame.len() == self.inner.outputs(),
                "buffers = {}, ouputs = {}",
                output_frame.len(),
                self.inner.outputs()
            );

            self.inner.tick32(&input_frame, &mut output_frame);

            // We move the data from the frame buffer into the planar buffer after processing.
            for (output, frame) in outputs.iter_mut().zip(output_frame) {
                // @todo assuming single channel
                output.channel_mut(0).unwrap()[i] = frame
            }
        }
    }
}
