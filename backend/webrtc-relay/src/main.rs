use anyhow::{Context, Result};
use clap::Parser;
use futures::{StreamExt, future::Either};
use libp2p::{
    core::muxing::StreamMuxerBox,
    kad::{store::MemoryStore, Kademlia, KademliaConfig},
    multiaddr::{Multiaddr, Protocol},
    relay,
    swarm::{NetworkBehaviour, Swarm, SwarmBuilder, SwarmEvent},
    PeerId, Transport, dns::TokioDnsConfig,
};
use libp2p::{identify, identity, ping, quic};
use libp2p_webrtc as webrtc;
use libp2p_webrtc::tokio::Certificate;
use log::info;
use std::path::Path;
use std::{net::Ipv4Addr, str::FromStr};
use tokio::fs;

const PORT_WEBRTC: u16 = 9090;
const PORT_QUIC: u16 = 9091;
const LOCAL_KEY_PATH: &str = "./cert/local_key";
const LOCAL_CERT_PATH: &str = "./cert/cert.pem";

#[derive(Debug, Parser)]
#[clap(name = "universal connectivity rust peer")]
struct Opt {
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
            SwarmEvent::ConnectionClosed { peer_id, cause, .. } => {
                log::debug!("Connection to {peer_id} closed: {cause:?}");
                swarm.behaviour_mut().kademlia.remove_peer(&peer_id);
            }
            SwarmEvent::Behaviour(BehaviourEvent::Identify(identify::Event::Received {
                peer_id,
                info,
                ..
            })) => {
                if !info.observed_addr.is_empty() {
                    log::debug!("Removed {peer_id} from the routing table (if it was in there).");
                    log::info!("Adding observed address {:?}", info.observed_addr);
                    swarm.add_external_address(info.observed_addr.clone());
                }

                for addr in &info.listen_addrs {
                    if !addr.is_empty() {
                        swarm
                            .behaviour_mut()
                            .kademlia
                            .add_address(&peer_id, addr.clone());

                        log::debug!("Adding address {:?} to peer {:?}", addr, peer_id)
                    }
                }

                log::debug!(
                    "Identify Event Received, peer_id :{}, info:{:?}",
                    peer_id, info
                );
            }
            SwarmEvent::NewListenAddr { address, .. } => {
                println!("Listening on {address:?}");
            }
            event => log::debug!("Unhandled Swarm Event {:?}", event),
        }
    }
}

#[derive(NetworkBehaviour)]
struct Behaviour {
    kademlia: Kademlia<MemoryStore>,
    relay: relay::Behaviour,
    ping: ping::Behaviour,
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
        let dns = TokioDnsConfig::system(quic)?;
        
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

    // Create a Kademlia behaviour.
    let cfg = KademliaConfig::default();
    let store = MemoryStore::new(local_peer_id);
    let mut kademlia = Kademlia::with_config(local_peer_id, store, cfg);

    let bootaddr = Multiaddr::from_str("/dnsaddr/bootstrap.libp2p.io").unwrap();

    for peer in &BOOTNODES {
        kademlia.add_address(&PeerId::from_str(peer).unwrap(), bootaddr.clone());
    }

    kademlia.bootstrap().unwrap();

    let behaviour = Behaviour {
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
