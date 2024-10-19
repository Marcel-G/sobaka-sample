use manager::Manager;
use tokio::join;
use tokio::time::sleep;
use std::sync::Arc;
use std::time::Duration;
use warp::ws::{WebSocket, Ws};
use warp::{Filter, Rejection, Reply};
use yrs_warp::signaling::{signaling_conn, SignalingService};
use yrs_webrtc::{Error, SignalingConn};

mod manager;


#[tokio::main]
async fn main() -> Result<(), Error> {
    env_logger::init();

    let signaling = tokio::spawn(signaling_server());
    sleep(Duration::from_secs(1)).await;
    let management = tokio::spawn(management_server());
    let _ = join!(signaling, management);

    Ok(())
}

async fn signaling_server() {
    let signaling = SignalingService::new();

    let ws = warp::path("signaling")
        .and(warp::ws())
        .and(warp::any().map(move || signaling.clone()))
        .and_then(ws_handler);

    warp::serve(ws).run(([0, 0, 0, 0], 8000)).await;
}

async fn new_managed(topic: String, manager: Manager) -> Result<impl Reply, Rejection> {
    manager.manage(topic).await;
    Ok(warp::reply::json(&()))
}

async fn management_server() {
    let c1 = Arc::new(SignalingConn::connect("ws://localhost:8000/signaling").await.unwrap());

    let mut event = c1.subscribe();

    tokio::spawn(async move {
        while let Ok(e) = event.recv().await {
            println!("received sig event: {:?}", e);
        };
    });

    let manager = Manager::new(c1);

    let managed = warp::path("managed")
        .and(warp::post())
        .and(warp::path::param::<String>())
        .and(warp::any().map(move || manager.clone()))
        .and_then(new_managed);

    warp::serve(managed).run(([0, 0, 0, 0], 8001)).await;
}

async fn ws_handler(ws: Ws, svc: SignalingService) -> Result<impl Reply, Rejection> {
    Ok(ws.on_upgrade(move |socket| peer(socket, svc)))
}

async fn peer(ws: WebSocket, svc: SignalingService) {
    match signaling_conn(ws, svc).await {
        Ok(_) => println!("signaling connection stopped"),
        Err(e) => eprintln!("signaling connection failed: {}", e),
    }
}
