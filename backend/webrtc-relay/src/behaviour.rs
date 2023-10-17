use std::{str::FromStr, time::Duration};

use libp2p::{
    autonat, gossipsub, identify, identity::Keypair, kad, memory_connection_limits, ping, relay,
    swarm::NetworkBehaviour, Multiaddr, PeerId,
};

const BOOTNODES: [&str; 4] = [
    "QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
    "QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
];

#[derive(NetworkBehaviour)]
pub(crate) struct Behaviour {
    limits: memory_connection_limits::Behaviour,
    pub(crate) kademlia: kad::Behaviour<kad::store::MemoryStore>,
    relay: relay::Behaviour,
    auto_nat: autonat::Behaviour,
    ping: ping::Behaviour,
    gossipsub: gossipsub::Behaviour,
    identify: identify::Behaviour,
}

impl Behaviour {
    pub(crate) fn new(local_key: &Keypair) -> Behaviour {
        let mut kademlia_config = kad::Config::default();
        // Instantly remove records and provider records.
        //
        // TODO: Replace hack with option to disable both.
        kademlia_config.set_record_ttl(Some(Duration::from_secs(0)));
        kademlia_config.set_provider_record_ttl(Some(Duration::from_secs(0)));

        let mut kademlia = kad::Behaviour::with_config(
            local_key.public().to_peer_id(),
            kad::store::MemoryStore::new(local_key.public().to_peer_id()),
            kademlia_config,
        );

        let bootaddr = Multiaddr::from_str("/dnsaddr/bootstrap.libp2p.io").unwrap();
        for peer in &BOOTNODES {
            kademlia.add_address(&PeerId::from_str(peer).unwrap(), bootaddr.clone());
        }

        kademlia.bootstrap().unwrap();

        Behaviour {
            kademlia,
            limits: memory_connection_limits::Behaviour::with_max_percentage(0.5),
            gossipsub: gossipsub::Behaviour::new(
                gossipsub::MessageAuthenticity::Signed(local_key.clone()),
                gossipsub::ConfigBuilder::default()
                    .validation_mode(gossipsub::ValidationMode::Permissive)
                    .mesh_outbound_min(1)
                    .mesh_n_low(1)
                    .flood_publish(true)
                    .build()
                    .expect("Correct configuration"),
            )
            .expect("Correct configuration"),
            identify: identify::Behaviour::new(
                identify::Config::new("/ipfs/id/1.0.0".to_string(), local_key.public())
                    .with_agent_version(format!("sobaka-rust-relay/{}", env!("CARGO_PKG_VERSION"))),
            ),
            auto_nat: autonat::Behaviour::new(
                local_key.public().to_peer_id(),
                autonat::Config {
                    only_global_ips: false,
                    ..Default::default()
                },
            ),
            ping: ping::Behaviour::new(ping::Config::new()),
            relay: relay::Behaviour::new(local_key.public().to_peer_id(), Default::default()),
        }
    }
}
