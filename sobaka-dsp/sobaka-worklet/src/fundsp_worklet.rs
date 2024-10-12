use enum_map::{Enum, EnumArray, EnumMap};
use fundsp::prelude::*;
use std::fmt::Debug;
use waw::{
    buffer::{AudioBuffer, Param, ParamBuffer},
    types::Never,
    worklet::sample_rate,
};

pub struct FundspWorklet<P = Never>
where
    P: EnumArray<Shared<f32>>,
{
    pub inner: Box<dyn AudioUnit32>,
    param_storage: EnumMap<P, Shared<f32>>,
}

impl<P> FundspWorklet<P>
where
    P: EnumArray<Shared<f32>> + EnumArray<Param> + Enum + Debug,
{
    pub fn create_param_storage() -> EnumMap<P, Shared<f32>> {
        EnumMap::default()
    }
    pub fn create<X: AudioNode<Sample = f32> + Send + Sync + 'static>(
        module: An<X>,
        param_storage: EnumMap<P, Shared<f32>>,
    ) -> Self {
        let mut worklet = FundspWorklet {
            inner: Box::new(module),
            param_storage,
        };

        worklet.inner.reset(Some(sample_rate()));
        worklet
    }

    pub fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<P>) {
        let (inputs, outputs) = audio.split();

        assert!(
            inputs.len() == self.inner.inputs(),
            "buffers = {}, inputs = {}",
            inputs.len(),
            self.inner.inputs()
        );
        assert!(
            outputs.len() == self.inner.outputs(),
            "buffers = {}, ouputs = {}",
            outputs.len(),
            self.inner.outputs()
        );
        let n_outputs = outputs.len();

        let input_buffers = inputs.iter().map(|i| i.channel(0)).collect::<Vec<_>>(); // Assuming mono for the moment
        let mut output_buffers = outputs
            .iter_mut()
            .map(|i| i.channel_mut(0))
            .collect::<Vec<_>>(); // Assuming mono for the moment

        for i in 0..128 {
            // Write all the paramaters into the AudioUnit. Usually, these will be the same value.
            // Could possibly distinguish between a-rate / k-rate here
            for (param, buffer) in params.iter() {
                self.param_storage[param].set_value(*buffer.as_ref().get(i).unwrap());
            }

            let input_frame: Vec<_> = input_buffers
                .iter()
                .map(|channel| *channel.and_then(|c| c.get(i)).unwrap_or(&0.0))
                .collect();

            let mut output_frame = vec![0.0; n_outputs]; // @todo assuming single channel

            self.inner.tick(&input_frame, &mut output_frame);

            // We move the data from the frame buffer into the planar buffer after processing.
            for (maybe_output, sample) in output_buffers.iter_mut().zip(output_frame) {
                if let Some(out_sample) = maybe_output.as_mut().and_then(|o| o.get_mut(i)) {
                    *out_sample = sample
                }
            }
        }
    }
}
