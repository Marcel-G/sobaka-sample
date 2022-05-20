extern crate rosc;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

use fundsp::hacker::AudioUnit32;
use fundsp::hacker32::{U1, U2};
use rosc::{OscPacket};
use sobaka_sample_audio_worklet::AudioProcessor;
use sobaka_sample_audio_worklet::graph::{Graph32, NodeIndex};
use sobaka_sample_audio_worklet::interface::address::{Address, Port};
use sobaka_sample_audio_worklet::interface::error::SobakaError;
use sobaka_sample_audio_worklet::interface::message::SobakaMessage;
use sobaka_sample_audio_worklet::module::AudioModuleType;
use std::convert::TryInto;
use std::net::{SocketAddrV4, UdpSocket};
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::{env, thread};

/// [iPad] -> [UDP Server] -> [Decode OSC] -> [Handle Message]

fn main() -> Result<(), SobakaError> {
    let args: Vec<String> = env::args().collect();
    let usage = format!("Usage {} IP:PORT", &args[0]);
    if args.len() < 2 {
        println!("{}", usage);
        ::std::process::exit(1)
    }
    let addr = match SocketAddrV4::from_str(&args[1]) {
        Ok(addr) => addr,
        Err(_) => panic!("{}", usage),
    };

    let processor = AudioProcessor::new(44100.0);

    let frequency = processor.create(AudioModuleType::Parameter)?;
    let oscillator = processor.create(AudioModuleType::Oscillator)?;

    processor.connect(
        Address { id: oscillator.id, port: Some(Port::Output(0)) },
        // @ todo global output
        Address { id: 1, port: Some(Port::Input(0)) },
    );
    processor.connect(
        Address { id: oscillator.id, port: Some(Port::Output(0)) },
        // @ todo global output
        Address { id: 1, port: Some(Port::Input(1)) },
    );

    processor.connect(
        Address { id: frequency.id, port: Some(Port::Output(0)) },
        Address { id: oscillator.id, port: Some(Port::Input(0)) },
    );

    let graph = processor.graph();

    thread::spawn(move || {
        // OSC stuff
        let sock = UdpSocket::bind(addr).unwrap();
        println!("Listening to {}", addr);

        let mut buf = [0_u8; rosc::decoder::MTU];
        loop {
            match sock.recv_from(&mut buf) {
                Ok((size, addr)) => {
                    println!("Received packet with size {} from: {}", size, addr);
                    let (_, packet) = rosc::decoder::decode_udp(&buf[..size]).unwrap();
                    match packet {
                        OscPacket::Message(msg) => {
                            println!("OSC address: {}", msg.addr);
                            println!("OSC arguments: {:?}", msg.args);
                            processor.message(msg.try_into().expect("weird messsage"));
                        }
                        OscPacket::Bundle(bundle) => {
                            println!("OSC Bundle: {:?}", bundle);
                        }
                    }
                }
                Err(e) => {
                    println!("Error receiving from socket: {}", e);
                    break;
                }
            }
        }
    });

    // Audio stuff
    let host = cpal::default_host();

    let device = host
        .default_output_device()
        .expect("failed to find a default output device");
    let config = device.default_output_config().unwrap();

    match config.sample_format() {
        cpal::SampleFormat::F32 => run::<f32>(graph, &device, &config.into()).unwrap(),
        cpal::SampleFormat::I16 => run::<i16>(graph, &device, &config.into()).unwrap(),
        cpal::SampleFormat::U16 => run::<u16>(graph, &device, &config.into()).unwrap(),
    };

    Ok(())
}

fn run<T>(
    shared_graph: Arc<Mutex<Graph32>>,
    device: &cpal::Device,
    config: &cpal::StreamConfig,
) -> Result<(), anyhow::Error>
where
    T: cpal::Sample,
{
    let sample_rate = config.sample_rate.0 as f64;
    let channels = config.channels as usize;

    shared_graph.lock().unwrap().reset(Some(sample_rate));

    let mut next_value = move || shared_graph.lock().unwrap().get_stereo();

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

fn write_data<T>(output: &mut [T], channels: usize, next_sample: &mut dyn FnMut() -> (f32, f32))
where
    T: cpal::Sample,
{
    for frame in output.chunks_mut(channels) {
        let sample = next_sample();
        let left: T = cpal::Sample::from::<f32>(&(sample.0));
        let right: T = cpal::Sample::from::<f32>(&(sample.1));

        for (channel, sample) in frame.iter_mut().enumerate() {
            if channel & 1 == 0 {
                *sample = left;
            } else {
                *sample = right;
            }
        }
    }
}
