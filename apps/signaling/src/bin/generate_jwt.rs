//! JWT Token Generator for Sobaka
//!
//! Generates JWT tokens for authenticating with the signaling server.
//! Use this to create worker tokens for the persistence service.
//!
//! # Usage
//!
//! ```bash
//! # Generate a worker token (for persistence service)
//! JWT_PRIVATE_KEY=your-secret generate-jwt --worker
//!
//! # Generate a client token (default)
//! JWT_PRIVATE_KEY=your-secret generate-jwt
//!
//! # Generate with a specific UUID
//! JWT_PRIVATE_KEY=your-secret generate-jwt --worker --uuid my-worker-id
//! ```

use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
enum PeerKind {
    #[serde(rename = "worker")]
    Worker,
    #[serde(rename = "client")]
    Client,
}

#[derive(Debug, Serialize, Deserialize)]
struct Token {
    uuid: String,
    kind: PeerKind,
    exp: usize,
}

fn get_jwt_secret() -> Vec<u8> {
    env::var("JWT_PRIVATE_KEY")
        .expect("JWT_PRIVATE_KEY environment variable not set")
        .into_bytes()
}

fn print_usage() {
    eprintln!(
        r#"
JWT Token Generator for Sobaka

USAGE:
    generate-jwt [OPTIONS]

OPTIONS:
    --worker        Generate a worker token (for persistence service)
    --client        Generate a client token (default)
    --uuid <UUID>   Use a specific UUID instead of generating one
    --help          Print this help message

ENVIRONMENT:
    JWT_PRIVATE_KEY  Required. The secret key used to sign tokens.
                     Must match the signaling server's key.

EXAMPLES:
    # Generate a worker token for development
    JWT_PRIVATE_KEY=dev-secret generate-jwt --worker

    # Generate a worker token with a specific ID
    JWT_PRIVATE_KEY=dev-secret generate-jwt --worker --uuid persistence-worker-1

    # Use in .env file for persistence service
    echo "JWT=$(JWT_PRIVATE_KEY=dev-secret generate-jwt --worker)" >> .env
"#
    );
}

fn main() {
    let args: Vec<String> = env::args().collect();

    // Parse arguments
    let mut is_worker = false;
    let mut custom_uuid: Option<String> = None;
    let mut i = 1;

    while i < args.len() {
        match args[i].as_str() {
            "--worker" => is_worker = true,
            "--client" => is_worker = false,
            "--uuid" => {
                i += 1;
                if i >= args.len() {
                    eprintln!("Error: --uuid requires a value");
                    std::process::exit(1);
                }
                custom_uuid = Some(args[i].clone());
            }
            "--help" | "-h" => {
                print_usage();
                std::process::exit(0);
            }
            arg => {
                eprintln!("Unknown argument: {}", arg);
                print_usage();
                std::process::exit(1);
            }
        }
        i += 1;
    }

    // Check for JWT_PRIVATE_KEY
    if env::var("JWT_PRIVATE_KEY").is_err() {
        eprintln!("Error: JWT_PRIVATE_KEY environment variable not set");
        eprintln!();
        eprintln!("Set it before running this command:");
        eprintln!("  JWT_PRIVATE_KEY=your-secret generate-jwt --worker");
        std::process::exit(1);
    }

    // Generate token
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    let token = Token {
        uuid: custom_uuid.unwrap_or_else(|| Uuid::new_v4().to_string()),
        kind: if is_worker {
            PeerKind::Worker
        } else {
            PeerKind::Client
        },
        exp: (now + 60 * 60 * 24 * 365) as usize, // 1 year
    };

    let jwt = encode(
        &Header::default(),
        &token,
        &EncodingKey::from_secret(&get_jwt_secret()),
    )
    .expect("Failed to encode JWT");

    // Output just the token (easy to use in scripts)
    println!("{}", jwt);

    // Print info to stderr so it doesn't interfere with piping
    eprintln!();
    eprintln!("Generated {} token:", if is_worker { "WORKER" } else { "CLIENT" });
    eprintln!("  UUID: {}", token.uuid);
    eprintln!("  Kind: {:?}", token.kind);
    eprintln!("  Expires: {} (1 year)", token.exp);
}
