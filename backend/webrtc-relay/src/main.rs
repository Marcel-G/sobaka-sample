use anyhow::{Context, Result};
use behaviour::BehaviourEvent;
use clap::Parser;
use futures::StreamExt;
use futures_timer::Delay;
use libp2p::{
    core::muxing::StreamMuxerBox,
    kad::{self},
    multiaddr::{Multiaddr, Protocol},
    noise,
    swarm::{Swarm, SwarmEvent},
    tcp, yamux, PeerId, Transport,
};

use libp2p::{identify, identity};
use libp2p_webrtc as webrtc;
use libp2p_webrtc::tokio::Certificate;
use log::info;
use std::{net::IpAddr, path::Path, time::Duration};
use std::{net::Ipv4Addr, task::Poll};
use tokio::fs;

use crate::behaviour::Behaviour;

mod behaviour;

const PORT_WEBRTC: u16 = 9090;
const PORT_QUIC: u16 = 9091;
const LOCAL_KEY_PATH: &str = "./cert/local_key";
const LOCAL_CERT_PATH: &str = "./cert/cert.pem";

const BOOTSTRAP_INTERVAL: Duration = Duration::from_secs(5 * 60);

#[derive(Debug, Parser)]
#[clap(name = "sobaka relay rust peer")]
struct Opt {
    /// Address to listen on.
    #[clap(long, default_value = "0.0.0.0")]
    listen_address: IpAddr,

    /// Address of a remote peer to connect to.
    #[clap(long)]
    remote_address: Option<Multiaddr>,
}

/// An example WebRTC peer that will accept connections
#[tokio::main]
async fn main() -> Result<()> {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let opt = Opt::parse();
    let local_key = read_or_create_identity(Path::new(LOCAL_KEY_PATH))
        .await
        .context("Failed to read identity")?;
    let webrtc_cert = read_or_create_certificate(Path::new(LOCAL_CERT_PATH))
        .await
        .context("Failed to read certificate")?;

    let mut swarm = create_swarm(local_key, webrtc_cert)?;

    swarm
        .listen_on(
            Multiaddr::from(Ipv4Addr::UNSPECIFIED)
                .with(Protocol::Udp(PORT_WEBRTC))
                .with(Protocol::WebRTCDirect),
        )
        .expect("listen on webrtc");

    swarm
        .listen_on(
            Multiaddr::from(Ipv4Addr::UNSPECIFIED)
                .with(Protocol::Udp(PORT_QUIC))
                .with(Protocol::QuicV1),
        )
        .expect("listen on quic-v1");

    swarm
        .listen_on(Multiaddr::from(Ipv4Addr::UNSPECIFIED).with(Protocol::Tcp(PORT_QUIC)))
        .expect("listen on tcp");

    if let Some(remote_address) = opt.remote_address {
        swarm
            .dial(remote_address)
            .expect("a valid remote address to be provided");
    }

    let mut bootstrap_timer = Delay::new(BOOTSTRAP_INTERVAL);

    loop {
        if let Poll::Ready(()) = futures::poll!(&mut bootstrap_timer) {
            bootstrap_timer.reset(BOOTSTRAP_INTERVAL);
            let _ = swarm.behaviour_mut().kademlia.bootstrap();
        }

        match swarm.next().await.expect("Infinite Stream.") {
            SwarmEvent::Behaviour(BehaviourEvent::Identify(e)) => {
                log::debug!("BehaviourEvent::Identify {:?}", e);
                if let identify::Event::Error { peer_id, error } = e {
                    match error {
                        libp2p::swarm::StreamUpgradeError::Timeout => {
                            // When a browser tab closes, we don't get a swarm event
                            // maybe there's a way to get this with TransportEvent
                            // but for now remove the peer from routing table if there's an Identify timeout
                            swarm.behaviour_mut().kademlia.remove_peer(&peer_id);
                            log::debug!(
                                "Removed {peer_id} from the routing table (if it was in there)."
                            );
                        }
                        _ => {
                            log::debug!("{error}");
                        }
                    }
                } else if let identify::Event::Received {
                    peer_id,
                    info:
                        identify::Info {
                            protocols,
                            listen_addrs,
                            observed_addr,
                            ..
                        },
                } = e
                {
                    log::debug!("identify::Event::Received observed_addr: {}", observed_addr);

                    swarm.add_external_address(observed_addr);

                    if protocols.iter().any(|p| *p == kad::PROTOCOL_NAME) {
                        for addr in listen_addrs {
                            swarm.behaviour_mut().kademlia.add_address(&peer_id, addr);
                        }
                    }
                }
            }
            SwarmEvent::NewListenAddr { address, .. } => {
                swarm.add_external_address(address.clone());

                let p2p_address = address.with(Protocol::P2p(*swarm.local_peer_id()));
                info!("Listening on {p2p_address}");
            }
            event => log::debug!("Unhandled Swarm Event {:?}", event),
        }
    }
}

fn create_swarm(
    local_key: identity::Keypair,
    certificate: Certificate,
) -> Result<Swarm<Behaviour>> {
    let local_peer_id = PeerId::from(local_key.public());
    println!("Local peer id: {local_peer_id}");

    let swarm = libp2p::SwarmBuilder::with_existing_identity(local_key.clone())
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_quic()
        .with_other_transport(|id_keys| {
            Ok(webrtc::tokio::Transport::new(id_keys.clone(), certificate)
                .map(|(peer_id, conn), _| (peer_id, StreamMuxerBox::new(conn))))
        })?
        .with_dns()?
        .with_behaviour(Behaviour::new)?
        .build();

    Ok(swarm)
}

async fn read_or_create_certificate(path: &Path) -> Result<Certificate> {
    if path.exists() {
        let pem = fs::read_to_string(&path).await?;

        info!("Using existing certificate from {}", path.display());

        return Ok(Certificate::from_pem(&pem)?);
    }

    let cert = Certificate::generate(&mut rand::thread_rng())?;
    fs::create_dir_all(path.parent().unwrap()).await?;
    fs::write(&path, &cert.serialize_pem().as_bytes()).await?;

    info!(
        "Generated new certificate and wrote it to {}",
        path.display()
    );

    Ok(cert)
}

async fn read_or_create_identity(path: &Path) -> Result<identity::Keypair> {
    if path.exists() {
        let bytes = fs::read(&path).await?;

        info!("Using existing identity from {}", path.display());

        return Ok(identity::Keypair::from_protobuf_encoding(&bytes)?); // This only works for ed25519 but that is what we are using.
    }

    let identity = identity::Keypair::generate_ed25519();

    fs::create_dir_all(path.parent().unwrap()).await?;
    fs::write(&path, &identity.to_protobuf_encoding()?).await?;

    info!("Generated new identity and wrote it to {}", path.display());

    Ok(identity)
}
