use log::LevelFilter;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;
use warp::ws::{WebSocket, Ws};
use warp::{Filter, Rejection, Reply};
use y_sync::awareness::Awareness;
use yrs::updates::decoder::Decode;
use yrs::Update;
use yrs_warp::signaling::{signaling_conn, SignalingService};
use yrs_webrtc::{Error, Room, SignalingConn};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let _ = env_logger::builder()
        .filter_level(LevelFilter::Error)
        .is_test(true)
        .try_init();

    let server = tokio::spawn(signaling_server());
    sleep(Duration::from_secs(1)).await;

    let c1 = Arc::new(SignalingConn::connect("ws://localhost:8000/signaling").await?);
    let r1 = Room::open("sample", Awareness::default(), [c1]);
    let mut pe1 = r1.peer_events().subscribe();

    r1.connect().await?;

    let _ = tokio::spawn(async move {
        while let Ok(e) = pe1.recv().await {
            println!("received peer event: {e:?}");
        }
    });

    let _sub = {
        let a = r1.awareness().write().await;
        a.doc().observe_update_v1(move |_, u| {
            let u = Update::decode_v1(&u.update).unwrap();
            println!("received update: {u:?}");
        })
    };

    server.await?;

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

async fn ws_handler(ws: Ws, svc: SignalingService) -> Result<impl Reply, Rejection> {
    Ok(ws.on_upgrade(move |socket| peer(socket, svc)))
}

async fn peer(ws: WebSocket, svc: SignalingService) {
    match signaling_conn(ws, svc).await {
        Ok(_) => println!("signaling connection stopped"),
        Err(e) => eprintln!("signaling connection failed: {}", e),
    }
}
