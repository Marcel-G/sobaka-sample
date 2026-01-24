use signal::connection::websocket_client;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use str0m::Candidate;
use systemstat::{Platform, System};
use tracing::{debug, error, info, warn};
use url::Url;

use client::Client;
use dotenv::dotenv;

mod client;
mod logging;
pub(crate) mod peer;
mod signal;
mod workspace;

/// Discover a usable network interface IP address.
///
/// Firefox will not accept 127.0.0.1 for WebRTC traffic, so we need to find
/// a real network interface address.
fn select_host_address() -> Option<IpAddr> {
    let system = System::new();
    let networks = match system.networks() {
        Ok(n) => n,
        Err(e) => {
            error!(error = %e, "Failed to enumerate network interfaces");
            return None;
        }
    };

    for (name, net) in networks.iter() {
        for n in &net.addrs {
            if let systemstat::IpAddr::V4(v) = n.addr {
                if !v.is_loopback() && !v.is_link_local() && !v.is_broadcast() {
                    debug!(
                        interface = %name,
                        address = %v,
                        "Found usable network interface"
                    );
                    return Some(IpAddr::V4(v));
                }
            }
        }
    }

    None
}

/// Get the public IP address for WebRTC candidates.
///
/// Uses PUBLIC_IP environment variable in cloud deployments,
/// falls back to network interface discovery for local development.
fn get_public_ip() -> IpAddr {
    if let Ok(public_ip) = std::env::var("PUBLIC_IP") {
        match public_ip.parse() {
            Ok(ip) => {
                info!(ip = %ip, "Using PUBLIC_IP from environment");
                return ip;
            }
            Err(e) => {
                error!(
                    public_ip = %public_ip,
                    error = %e,
                    "Invalid PUBLIC_IP format, falling back to interface discovery"
                );
            }
        }
    }

    match select_host_address() {
        Some(ip) => {
            info!(ip = %ip, "Using discovered network interface");
            ip
        }
        None => {
            error!("No usable network interface found");
            panic!("Found no usable network interface");
        }
    }
}

/// Get the signaling server URL from environment or use default.
fn get_signal_server() -> Url {
    let signal_server = std::env::var("SIGNAL_SERVER")
        .unwrap_or_else(|_| "ws://localhost:8000/signaling".to_string());

    match Url::parse(&signal_server) {
        Ok(url) => {
            info!(url = %url, "Signaling server configured");
            url
        }
        Err(e) => {
            error!(
                url = %signal_server,
                error = %e,
                "Invalid SIGNAL_SERVER URL"
            );
            panic!("Invalid SIGNAL_SERVER URL: {}", signal_server);
        }
    }
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    logging::init();

    info!("Persistence worker starting up");

    // Parse and validate port
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3478".to_string())
        .parse()
        .expect("PORT must be a valid number");

    // Bind UDP socket
    let socket = match UdpSocket::bind((Ipv4Addr::UNSPECIFIED, port)) {
        Ok(s) => {
            info!(port = port, "UDP socket bound successfully");
            s
        }
        Err(e) => {
            error!(port = port, error = %e, "Failed to bind UDP socket");
            panic!("Failed to bind UDP socket on port {}: {}", port, e);
        }
    };

    let addr = socket.local_addr().expect("a local socket address");

    // Connect to signaling server
    let jwt_token = std::env::var("JWT").ok();
    if jwt_token.is_some() {
        info!("Using pre-configured JWT token");
    } else {
        warn!("No JWT token configured - will receive new identity from signaling server");
    }

    let handle = websocket_client(get_signal_server(), jwt_token);

    // Configure WebRTC candidate
    let public_ip = get_public_ip();
    let candidate_addr: SocketAddr = (public_ip, addr.port()).into();

    info!(
        candidate_addr = %candidate_addr,
        "Local WebRTC candidate configured"
    );

    let candidate = Candidate::host(candidate_addr, "udp").expect("a host candidate");

    let mut client = Client::new(socket, candidate, handle);

    info!("Persistence worker ready, entering main loop");
    client.run()
}
