use std::error::Error;

use jwt::Token;
use signaling::{signaling_conn, SignalingService};
use tracing::{debug, error, info, info_span, warn, Instrument};
use warp::ws::{WebSocket, Ws};
use warp::{Filter, Rejection, Reply};

mod jwt;
mod logging;
mod protocol;
mod signaling;

/// Start the signaling WebSocket server.
///
/// Listens on all interfaces (0.0.0.0) port 8000.
pub async fn signaling_server() {
    let signaling = SignalingService::new();

    let ws = warp::path("signaling")
        .and(warp::ws())
        .and(warp::cookie::optional("jwt"))
        .and(warp::any().map(move || signaling.clone()))
        .and_then(ws_handler);

    let addr = ([0, 0, 0, 0], 8000);
    info!(
        host = %"0.0.0.0",
        port = 8000,
        "Starting signaling server"
    );

    warp::serve(ws).run(addr).await;
}

async fn ws_handler(
    ws: Ws,
    jwt_cookie: Option<String>,
    svc: SignalingService,
) -> Result<impl Reply, Rejection> {
    let (token, is_new) = match jwt_cookie {
        Some(token_str) => {
            // Try to validate the existing token
            match Token::decode(&token_str) {
                Ok(t) => {
                    debug!(uuid = %t.uuid, "Validated existing JWT token");
                    (t, false)
                }
                Err(e) => {
                    warn!(error = %e, "Invalid JWT token, generating new one");
                    (Token::new(), true)
                }
            }
        }
        None => {
            debug!("No JWT cookie present, generating new token");
            (Token::new(), true)
        }
    };

    let jwt = token.encode();

    info!(
        uuid = %token.uuid,
        kind = ?token.kind,
        is_new_token = is_new,
        "WebSocket connection initiated"
    );

    Ok(ws.on_upgrade(move |socket| peer(socket, svc, token)))
        .map(|reply| {
            warp::reply::with_header(
                reply,
                "Set-Cookie",
                format!("jwt={}; HttpOnly; Path=/", jwt),
            )
        })
        .map(|reply| warp::reply::with_header(reply, "Cache-Control", "no-cache=\"Set-Cookie\""))
}

async fn peer(ws: WebSocket, svc: SignalingService, token: Token) {
    let span = info_span!(
        "peer_connection",
        uuid = %token.uuid,
        kind = ?token.kind
    );

    async move {
        match signaling_conn(ws, svc, token.clone()).await {
            Ok(_) => {
                info!("Connection closed gracefully");
            }
            Err(e) => {
                error!(error = %e, "Connection failed");
            }
        }
    }
    .instrument(span)
    .await
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    logging::init();

    info!("Signaling server starting up");

    tokio::spawn(signaling_server()).await?;

    Ok(())
}
