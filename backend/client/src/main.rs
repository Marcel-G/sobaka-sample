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
