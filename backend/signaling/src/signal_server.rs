use warp::ws::{WebSocket, Ws};
use warp::{Filter, Rejection, Reply};
use yrs_warp::signaling::{signaling_conn, SignalingService};

// TODO: The signaling server has with ping to resolve
//       try https://github.com/ngryman/signaling
//       In any case signaling server will need to handle auth
pub async fn signaling_server() {
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
