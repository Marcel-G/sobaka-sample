use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Well-known UUID for the global root workspace.
/// This workspace contains the "Intro" list visible to all users.
pub const GLOBAL_ROOT_UUID: &str = "00000000-0000-0000-0000-000000000000";

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum PeerKind {
    #[serde(rename = "worker")]
    Worker,
    #[serde(rename = "client")]
    Client,
    #[serde(rename = "admin")]
    Admin,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Message {
    #[serde(rename = "publish")]
    Publish {
        topic: String,
        data: MessageData,
        identity: Option<String>,
        kind: Option<PeerKind>,
    },
    #[serde(rename = "subscribe")]
    Subscribe { topics: Vec<String> },
    #[serde(rename = "unsubscribe")]
    Unsubscribe { topics: Vec<String> },
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "pong")]
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MessageData {
    #[serde(rename = "announce")]
    Announce { from: String },
    #[serde(rename = "signal")]
    Signal {
        from: String,
        to: String,
        signal: Value,
    },
}
