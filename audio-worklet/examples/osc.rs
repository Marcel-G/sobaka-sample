extern crate rosc;

use cpal::traits::{DeviceTrait, StreamTrait, HostTrait};

use fundsp::hacker::*;

use rosc::{OscPacket, OscType};
use std::{env, thread};
use std::net::{SocketAddrV4, UdpSocket};
use std::str::FromStr;
use std::sync::{Mutex, Arc};

/// [iPad] -> [UDP Server] -> [Decode OSC] -> [Handle Message]

fn main() {
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

    let graph = tag(0, 440.0) >> sine();

    let shared_graph: Arc<Mutex<Box<dyn AudioUnit64 + Send>>> = Arc::new(Mutex::new(Box::new(graph)));


    let shared_graph_osc = shared_graph.clone();
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

                            match msg.addr.as_str() {
                                "/sobaka/hello/" => {
                                    match msg.args[..] {
                                        [OscType::Float(num)] => {
                                            shared_graph_osc.lock().unwrap().set(0, num as f64);
                                        }
                                        _ => {
                                            println!("dunno man")
                                        }
                                    }
                                }
                                _ => {
                                    println!("No handler")
                                }
                            }

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
        cpal::SampleFormat::F32 => run::<f32>(shared_graph, &device, &config.into()).unwrap(),
        cpal::SampleFormat::I16 => run::<i16>(shared_graph, &device, &config.into()).unwrap(),
        cpal::SampleFormat::U16 => run::<u16>(shared_graph, &device, &config.into()).unwrap(),
    }
}

fn run<T>(shared_graph: Arc<Mutex<Box<dyn AudioUnit64 + Send>>>, device: &cpal::Device, config: &cpal::StreamConfig) -> Result<(), anyhow::Error>
where
    T: cpal::Sample,
{
    let sample_rate = config.sample_rate.0 as f64;
    let channels = config.channels as usize;

    shared_graph.lock().unwrap().reset(Some(sample_rate));

    let mut next_value = move || {
        shared_graph.lock().unwrap().get_stereo()
    };

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