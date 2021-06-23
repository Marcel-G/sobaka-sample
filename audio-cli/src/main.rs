extern crate cpal;
use sobaka_sample_audio_core::{sequencer::Sequencer};

use cpal::{Sample, traits::{DeviceTrait, HostTrait, StreamTrait}};
fn main() {
  let host = cpal::default_host();

  let device = host.default_output_device().expect("no output device available");

  let config = device.default_output_config().unwrap();
  println!("Default output config: {:?}", config);

  match config.sample_format() {
    cpal::SampleFormat::F32 => run::<f32>(&device, &config.into()),
    cpal::SampleFormat::I16 => run::<i16>(&device, &config.into()),
    cpal::SampleFormat::U16 => run::<u16>(&device, &config.into()),
  }
}

pub fn run<T>(device: &cpal::Device, config: &cpal::StreamConfig)
where T: cpal::Sample,
{
  let err_fn = |err| eprintln!("an error occurred on the output audio stream: {}", err);

  let sample_rate = config.sample_rate.0 as f32;
  let channels = config.channels as usize;

  println!("sample_rate: {}", sample_rate);
  println!("channels: {}", channels);

  let mut sequencer = Sequencer::new();

  let mut next_value = move || {
    sequencer.tick(1)[0] * 0.01
  };

  let stream = device.build_output_stream(
    &config,
    move |data: &mut [T], _: &cpal::OutputCallbackInfo| {
      write_data(data, channels, &mut next_value)
    },
    err_fn
  ).unwrap();

  stream.play().unwrap();

  loop {
    // keep everything running?
  }
}

fn write_data<T: Sample>(data: &mut [T], channels: usize, next_sample: &mut dyn FnMut() -> f32) {
  for frame in data.chunks_mut(channels) {
    let value: T = cpal::Sample::from::<f32>(&next_sample());
    for channel in frame.iter_mut() {
      *channel = value;
    }
  }
}
