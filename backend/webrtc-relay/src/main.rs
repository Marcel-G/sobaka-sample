use anyhow::{Context, Result};
use clap::Parser;
use futures::{future::Either, StreamExt};
use libp2p::{
    core::muxing::StreamMuxerBox,
    dns, gossipsub, kad::{self, Mode},
    multiaddr::{Multiaddr, Protocol},
    relay,
    swarm::{NetworkBehaviour, Swarm, SwarmBuilder, SwarmEvent},
    PeerId, Transport,
};

use libp2p::{identify, identity, ping, quic, memory_connection_limits};
use libp2p_webrtc as webrtc;
use libp2p_webrtc::tokio::Certificate;
use log::info;
use std::{io, path::Path, net::IpAddr};
use std::{net::Ipv4Addr, str::FromStr};
use tokio::fs;

const PORT_WEBRTC: u16 = 9090;
const PORT_QUIC: u16 = 9091;
const LOCAL_KEY_PATH: &str = "./cert/local_key";
const LOCAL_CERT_PATH: &str = "./cert/cert.pem";

#[derive(Debug, Parser)]
#[clap(name = "universal connectivity rust peer")]
struct Opt {
    /// Address to listen on.
    #[clap(long, default_value = "0.0.0.0")]
    listen_address: IpAddr,

    /// Address of a remote peer to connect to.
    #[clap(long)]
    remote_address: Option<Multiaddr>,
}

const BOOTNODES: [&str; 4] = [
    "QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
    "QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
];

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

    let address_webrtc = Multiaddr::from(Ipv4Addr::UNSPECIFIED)
        .with(Protocol::Udp(PORT_WEBRTC))
        .with(Protocol::WebRTCDirect);

    let address_quic = Multiaddr::from(Ipv4Addr::UNSPECIFIED)
        .with(Protocol::Udp(PORT_QUIC))
        .with(Protocol::QuicV1);

    swarm
        .listen_on(address_webrtc.clone())
        .expect("listen on webrtc");
    swarm
        .listen_on(address_quic.clone())
        .expect("listen on quic");

    if let Some(remote_address) = opt.remote_address {
        swarm
            .dial(remote_address)
            .expect("a valid remote address to be provided");
    }

    loop {
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
                            log::debug!("Removed {peer_id} from the routing table (if it was in there).");
                        }
                        _ => {
                            log::debug!("{error}");
                        }
                    }
                } else if let identify::Event::Received {
                    peer_id,
                    info:
                        identify::Info {
                            listen_addrs,
                            observed_addr,
                            ..
                        },
                } = e
                {
                    log::debug!("identify::Event::Received observed_addr: {}", observed_addr);

                    swarm.add_external_address(observed_addr);

                    for addr in listen_addrs {
                        log::debug!("identify::Event::Received listen addr: {}", addr);

                        swarm
                            .behaviour_mut()
                            .kademlia
                            .add_address(&peer_id, addr.clone());

                        log::debug!("Added {addr} to the routing table.");
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

#[derive(NetworkBehaviour)]
struct Behaviour {
    limits: memory_connection_limits::Behaviour,
    kademlia: kad::Behaviour<kad::store::MemoryStore>,
    relay: relay::Behaviour,
    ping: ping::Behaviour,
    gossipsub: gossipsub::Behaviour,
    identify: identify::Behaviour,
}

fn create_swarm(
    local_key: identity::Keypair,
    certificate: Certificate,
) -> Result<Swarm<Behaviour>> {
    let local_peer_id = PeerId::from(local_key.public());
    println!("Local peer id: {local_peer_id}");

    let transport = {
        let webrtc = webrtc::tokio::Transport::new(local_key.clone(), certificate);
        let quic = quic::tokio::Transport::new(quic::Config::new(&local_key));

        // @todo -- change to dns::async_std::Transport
        // https://github.com/libp2p/rust-libp2p/pull/4505/files
        let dns = dns::tokio::Transport::system(quic)?;

        webrtc
            .or_transport(dns)
            .map(|either_output, _| match either_output {
                Either::Left((peer_id, muxer)) => (peer_id, StreamMuxerBox::new(muxer)),
                Either::Right((peer_id, muxer)) => (peer_id, StreamMuxerBox::new(muxer)),
            })
            .boxed()
    };

    let identify_config = identify::Behaviour::new(
        identify::Config::new("/ipfs/id/1.0.0".to_string(), local_key.public())
            .with_agent_version(format!("sobaka-rust-relay/{}", env!("CARGO_PKG_VERSION"))),
    );

    let gossipsub_config = gossipsub::ConfigBuilder::default()
        .validation_mode(gossipsub::ValidationMode::Permissive)
        .mesh_outbound_min(1)
        .mesh_n_low(1)
        .flood_publish(true)
        .build()
        .map_err(|msg| io::Error::new(io::ErrorKind::Other, msg))?; // Temporary hack because `build` does not return a proper `std::error::Error`.

    // Create a Kademlia behaviour.
    let cfg = kad::Config::default();
    let store = kad::store::MemoryStore::new(local_peer_id);
    let mut kademlia = kad::Behaviour::with_config(local_peer_id, store, cfg);
    
    kademlia.set_mode(Some(Mode::Client));

    let bootaddr = Multiaddr::from_str("/dnsaddr/bootstrap.libp2p.io").unwrap();

    for peer in &BOOTNODES {
        kademlia.add_address(&PeerId::from_str(peer).unwrap(), bootaddr.clone());
    }

    kademlia.bootstrap().unwrap();

    let behaviour = Behaviour {
        limits: memory_connection_limits::Behaviour::with_max_percentage(0.8),
        gossipsub: gossipsub::Behaviour::new(
            gossipsub::MessageAuthenticity::Signed(local_key),
            gossipsub_config,
        )
        .expect("Correct configuration"),
        kademlia,
        identify: identify_config,
        ping: ping::Behaviour::new(ping::Config::new()),
        relay: relay::Behaviour::new(local_peer_id, Default::default()),
    };
    Ok(SwarmBuilder::with_tokio_executor(transport, behaviour, local_peer_id).build())
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
