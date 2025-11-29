use core::panic;
use signal::connection::websocket_client;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use str0m::Candidate;
use systemstat::{Platform, System};
use url::Url;

use client::Client;
use dotenv::dotenv;

mod client;
pub(crate) mod peer;
mod signal;
mod workspace;

// Figure out some public IP address, since Firefox will not accept 127.0.0.1 for WebRTC traffic.
fn select_host_address() -> IpAddr {
    let system = System::new();
    let networks = system.networks().unwrap();

    for net in networks.values() {
        for n in &net.addrs {
            if let systemstat::IpAddr::V4(v) = n.addr {
                if !v.is_loopback() && !v.is_link_local() && !v.is_broadcast() {
                    return IpAddr::V4(v);
                }
            }
        }
    }

    panic!("Found no usable network interface");
}

fn get_public_ip() -> IpAddr {
    // For local development, fall back to detecting interface
    if let Ok(aws_ip) = std::env::var("PUBLIC_IP") {
        aws_ip.parse().expect("Invalid PUBLIC_IP format")
    } else {
        select_host_address()
    }
}

fn get_signal_server() -> Url {
    let signal_server = std::env::var("SIGNAL_SERVER")
        .unwrap_or_else(|_| "ws://localhost:8000/signaling".to_string());
    Url::parse(&signal_server).expect("a valid URL for the signal server")
}

#[tokio::main]
async fn main() {
    env_logger::init();
    dotenv().ok();

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3478".to_string()) // Standard STUN/TURN port
        .parse::<u16>()
        .expect("PORT must be a valid number");

    let socket =
        UdpSocket::bind((Ipv4Addr::UNSPECIFIED, port)).expect("binding to specified UDP port");

    let addr = socket.local_addr().expect("a local socket address");
    log::info!("Bound UDP port: {}", addr);

    let handle = websocket_client(get_signal_server(), std::env::var("JWT").ok());

    // Add the shared UDP socket as a host candidate
    let candidate_addr: SocketAddr = (get_public_ip(), addr.port()).into();

    log::info!("Local Candidate: {}", candidate_addr);
    let candidate = Candidate::host(candidate_addr, "udp").expect("a host candidate");

    let mut client = Client::new(socket, candidate, handle);

    client.run()
}
