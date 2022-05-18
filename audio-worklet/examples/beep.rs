//! Make some noise via cpal.
#![allow(clippy::precedence)]

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

use fundsp::hacker::*;
use fundsp_graph::graph::Graph64;
use sobaka_sample_audio_worklet::modules::trigger::trigger;

fn main() {
    let host = cpal::default_host();

    let device = host
        .default_output_device()
        .expect("failed to find a default output device");
    let config = device.default_output_config().unwrap();

    match config.sample_format() {
        cpal::SampleFormat::F32 => run::<f32>(&device, &config.into()).unwrap(),
        cpal::SampleFormat::I16 => run::<i16>(&device, &config.into()).unwrap(),
        cpal::SampleFormat::U16 => run::<u16>(&device, &config.into()).unwrap(),
    }
}

fn run<T>(device: &cpal::Device, config: &cpal::StreamConfig) -> Result<(), anyhow::Error>
where
    T: cpal::Sample,
{
    let sample_rate = config.sample_rate.0 as f64;
    let channels = config.channels as usize;

    let mut net = Graph64::new::<U0, U2>();
    net.reset(Some(sample_rate));


    // Oscillator
    // Input 0: frequency
    // Output 0: sq
    // Output 1: sin
    // Output 2: sq
    // Output 3: tri
    //   ┌──OSCILLATOR─────┐
    // ──►      (0) ─SINE──┼─►
    //   │      (1) ─SAW───┼─►
    //   │      (2) ─SQU───┼─►
    //   │      (3) ─TRI───┼─►
    //   └─────────────────┘

    let attenuated_saw = saw() * tag(0, 0.25);
    let attenuated_sine = sine() * tag(0, 0.25);
    let attenuated_square = square() * tag(0, 0.25);
    let attenuated_triangle = triangle() * tag(0, 0.25);

    let oscillator_node = oversample(
        attenuated_saw ^
        attenuated_sine ^
        attenuated_square ^
        attenuated_triangle
    );

    //   ┌──VCA────────────┐
    // ──►      (0) ─OUT───┼─►
    // ──►                 │
    //   └─────────────────┘
    let vca_node = pass() * tag(0, 1.0) * pass();


    //   ┌──SEQUENCER──────┐
    //   │ (0)..(16) ─CV───┼─►
    //   │           ─TRIG─┼─►
    //   └─────────────────┘
    let mut sequencer = Sequencer::new(sample_rate, 2);

    // This thing is a bit shit...

    //   ┌──CLOCK-DIVIDER──┐
    //   │ (0)       ─1/1──┼─►
    //   │           ─1/2──┼─►
    //   │           ─1/3──┼─►
    //   │           ─1/4──┼─►
    //   └─────────────────┘


    let lfo_square = || lfo2(|t, pitch| {
        let duty = sin_hz(pitch, t);
        if duty > 0.0 {
            1.0
        } else {
            -1.0
        }
    });

    // x-------
    // x---x---
    // x-x-x-x-
    // xxxxxxxx
    let clock_divider_node = branch::<U4, _, _>(|n| {
        println!("n: {:?}", n);
        mul(1.0 / (n as f64 + 1.0)) >> lfo_square()
    });

    let clock = net.add(Box::new(constant(bpm_hz(220.0)) >> clock_divider_node));

    // @todo how to trigger stuff

    let trig_node_1 = trigger(envelope(|t| 20.0 * exp(-t * 5.0))) * saw_hz(220.0);
    let trig_node_2 = trigger(envelope(|t| 90.0 * exp(-t * 5.0))) * sine_hz(880.0);
    let trig_node_3 = trigger(envelope(|t| 120.0 * exp(-t * 5.0))) * saw_hz(1760.0);

    // let seq = square_hz(1200.0) >> trig_node * sine_hz(440.0);


    let trig_1 = net.add(Box::new(trig_node_1));
    let trig_2 = net.add(Box::new(trig_node_2));
    let trig_3 = net.add(Box::new(trig_node_3));

    net.connect(clock, 0, trig_1, 0);
    net.connect(clock, 3, trig_2, 0);
    net.connect(clock, 2, trig_3, 0);

    println!("inputs: {:?}", oscillator_node.inputs());

    let oscillator = net.add(Box::new(oscillator_node));

    // net.connect(f, 0, oscillator, 0);

    net.connect_output(trig_2, 0, 0);
    // net.connect_output(trig_2, 0, 1);
    net.connect_output(trig_3, 0, 1);
    // net.connect_output(oscillator, 1, 1);
    // net.connect_output(oscillator, 1, 1);


    let mut next_value = move || net.get_stereo();

    let err_fn = |err| eprintln!("an error occurred on stream: {}", err);

    let stream = device.build_output_stream(
        config,
        move |data: &mut [T], _: &cpal::OutputCallbackInfo| {
            write_data(data, channels, &mut next_value)
        },
        err_fn,
    )?;
    stream.play()?;

    std::thread::sleep(std::time::Duration::from_millis(50000));

    Ok(())
}

fn write_data<T>(output: &mut [T], channels: usize, next_sample: &mut dyn FnMut() -> (f64, f64))
where
    T: cpal::Sample,
{
    for frame in output.chunks_mut(channels) {
        let sample = next_sample();
        let left: T = cpal::Sample::from::<f32>(&(sample.0 as f32));
        let right: T = cpal::Sample::from::<f32>(&(sample.1 as f32));

        for (channel, sample) in frame.iter_mut().enumerate() {
            if channel & 1 == 0 {
                *sample = left;
            } else {
                *sample = right;
            }
        }
    }
}
