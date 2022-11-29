use enum_map::{EnumArray, Enum};
use fundsp::prelude::*;
use std::{fmt::Debug, convert::TryInto};
use wasm_worklet::{types::{ParamMap, Buffer}};

pub struct FundspWorklet {
    inner: Au
}

impl FundspWorklet {
    pub fn create<
        X: AudioNode<Sample = f32> + Send + 'static
    >(module: An<X>) -> Self {
        FundspWorklet {
            inner: Au::Unit32(Box::new(module)),
        }
    }

    pub fn process<P: EnumArray<Buffer> + Enum + Debug>(
        &mut self,
        inputs: &[&[[f32; 128]]],
        outputs: &mut [&mut [[f32; 128]]],
        params: &ParamMap<P>,
    ) {
        for i in 0..128 {
            // Write all the paramaters into the AudioUnit. Usually, these will be the same value.
            // Could possibly distinguish between a-rate / k-rate here
            for (param, buffer) in params.iter() {
                self.inner
                    .set(param.into_usize().try_into().unwrap(), *buffer.as_ref().get(i).unwrap() as f64);
            }

            let input_frame: Vec<_> = inputs
                .iter()
                // @todo hardcoded channel one - maybe flatten?
                .map(|channel| channel[0][i])
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
            for (channel, frame) in outputs.iter_mut().zip(output_frame) {
                // @todo assuming single channel
                channel[0][i] = frame
            }
        }
    }
}
