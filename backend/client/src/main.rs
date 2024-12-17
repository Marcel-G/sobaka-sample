use std::future::poll_fn;

use client::{Client, ClientError, ClientEvent, ClientOptions};

mod client;
pub(crate) mod peer;
mod signal;
mod workspace;

#[tokio::main]
async fn main() -> Result<(), ClientError> {
    env_logger::init();

    let mut client = Client::new_with_options(ClientOptions {
        signal_url: "ws://localhost:8000/signaling".into(),
    });

    client.connect();
    client.join_workspace("test".into());

    match poll_fn(|cx| client.poll(cx)).await {
        Err(ClientError::ForceShutdown) => {
            println!("sobaka-client force shutdown");
        }
        Ok(ClientEvent::Closed) => {
            println!("sobaka-client closed");
        }
    }

    Ok(())
}

// API 
// - `/auth` ?
// - `/subscribe/{cid}` - jwt { uuid: string, role: string }
// - `/unsubscribe/{cid}` - jwt { uuid: string, role: string }
//
// Subscribe
//  Adds uuid to list of subscribers for cid
//
// Unsuscribe
//  Removes uuid from list of subscribers for cid
//
// Document Worker
//  One worker is spawned for each cid that has more tha 0 subscribers
//
// Document
//  Owner: uuid of the owner
//  Collaborators: uuids of anyone who can edit
//
// Incoming updates are discarded from users that are not Owner or Collaborator (Client and Server)
// Any user may get synced updates
//
