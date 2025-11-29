use std::time::{SystemTime, UNIX_EPOCH};

use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::protocol::PeerKind;

use std::env;

// Remove the const JWT_SECRET and replace with a function to get the secret
fn get_jwt_secret() -> Vec<u8> {
    env::var("JWT_PRIVATE_KEY")
        .expect("JWT_PRIVATE_KEY environment variable not set")
        .into_bytes()
}

// Token struct with space for more properties
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Token {
    pub uuid: String,
    pub kind: PeerKind,
    pub exp: usize,
}

impl Token {
    // Create a new token with a UUID and optional properties
    pub fn new() -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs();

        Token {
            uuid: Uuid::new_v4().to_string(),
            kind: PeerKind::Client,
            exp: (now + 60 * 60 * 24 * 365) as usize, // 1 year expiration
        }
    }

    // Encode the token into a JWT string
    pub fn encode(&self) -> String {
        encode(
            &Header::default(),
            &self,
            &EncodingKey::from_secret(&get_jwt_secret()),
        )
        .expect("Failed to encode JWT")
    }

    // Update decode method
    pub fn decode(token: &str) -> Result<Self, jsonwebtoken::errors::Error> {
        decode::<Self>(
            token,
            &DecodingKey::from_secret(&get_jwt_secret()),
            &Validation::new(Algorithm::HS256),
        )
        .map(|data| data.claims)
    }
}
