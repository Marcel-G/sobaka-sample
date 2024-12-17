use std::time::{SystemTime, UNIX_EPOCH};

use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const JWT_SECRET: &[u8] = b"super_secret_key"; // TODO: load a proper secret

// Token struct with space for more properties
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Token {
    pub uuid: String,
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
            exp: (now + 60 * 60 * 24 * 365) as usize, // 1 year expiration
        }
    }

    // Encode the token into a JWT string
    pub fn encode(&self) -> String {
        encode(
            &Header::default(),
            &self,
            &EncodingKey::from_secret(JWT_SECRET),
        )
        .expect("Failed to encode JWT")
    }

    // Decode a JWT string into a Token struct
    pub fn decode(token: &str) -> Result<Self, jsonwebtoken::errors::Error> {
        decode::<Self>(
            token,
            &DecodingKey::from_secret(JWT_SECRET),
            &Validation::new(Algorithm::HS256),
        )
        .map(|data| data.claims)
    }
}
