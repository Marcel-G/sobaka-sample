use std::error::Error;

use jwt::Token;
use signaling::{signaling_conn, SignalingService};
use warp::ws::{WebSocket, Ws};
use warp::{Filter, Rejection, Reply};

mod jwt;
mod protocol;
mod signaling;

// TODO: The signaling server has with ping to resolve
//       try https://github.com/ngryman/signaling
//       In any case signaling server will need to handle auth
pub async fn signaling_server() {
    let signaling = SignalingService::new();

    let ws = warp::path("signaling")
        .and(warp::ws())
        .and(warp::cookie::optional("jwt"))
        .and(warp::any().map(move || signaling.clone()))
        .and_then(ws_handler);

    warp::serve(ws).run(([0, 0, 0, 0], 8000)).await;
}

async fn ws_handler(
    ws: Ws,
    jwt_cookie: Option<String>,
    svc: SignalingService,
) -> Result<impl Reply, Rejection> {
    let token = match jwt_cookie {
        Some(token_str) => {
            // Try to validate the existing token
            match Token::decode(&token_str) {
                Ok(t) => t,
                Err(_) => Token::new(), // Generate a new token if invalid
            }
        }
        None => Token::new(), // No cookie; generate a new token
    };

    let jwt = token.encode(); // Encode the token into a JWT string

    println!("uuid: {} kind: {:?}", token.uuid, token.kind);

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
    match signaling_conn(ws, svc, token).await {
        Ok(_) => println!("signaling connection stopped"),
        Err(e) => eprintln!("signaling connection failed: {}", e),
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    env_logger::init();

    tokio::spawn(signaling_server()).await?;

    Ok(())
}
