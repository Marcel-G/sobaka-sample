use std::error::Error;

use signal_server::signaling_server;

mod signal_server;


#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    env_logger::init();

    tokio::spawn(signaling_server()).await?;

    Ok(())
}

