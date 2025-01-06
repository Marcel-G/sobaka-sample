use core::panic;
use signal::connection::websocket_client;
use std::net::{IpAddr, UdpSocket};
use systemstat::{Platform, System};
use url::Url;

use client::Client;
use dotenv::dotenv;

mod client;
pub(crate) mod peer;
mod signal;
mod workspace;

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

#[tokio::main]
async fn main() {
    env_logger::init();
    dotenv().ok();

    // Figure out some public IP address, since Firefox will not accept 127.0.0.1 for WebRTC traffic.
    let host_addr = select_host_address();

    // Spin up a UDP socket for the RTC. All WebRTC traffic is going to be multiplexed over this single
    // server socket. Clients are identified via their respective remote (UDP) socket address.
    let socket = UdpSocket::bind(format!("{host_addr}:0")).expect("binding a random UDP port");
    let addr = socket.local_addr().expect("a local socket adddress");
    log::info!("Bound UDP port: {}", addr);

    let handle = websocket_client(
        Url::parse(&"ws://localhost:8000/signaling").expect("Failed to parse signal URL"),
        std::env::var("JWT").ok(),
    );

    let mut client = Client::new(socket, handle);

    client.run()
}
