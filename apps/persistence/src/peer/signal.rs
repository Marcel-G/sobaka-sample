use serde::{ser::SerializeStruct, Deserialize, Deserializer, Serialize};
use std::net::SocketAddr;
use str0m::{
    change::{SdpAnswer, SdpOffer},
    net::Protocol,
    Candidate,
};

#[derive(Debug)]
pub enum Signal {
    // https://github.com/feross/simple-peer/blob/f1a492d1999ce727fa87193ebdea20ac89c1fc6d/index.js#L418-L421
    Renegotiate(bool),
    // https://github.com/feross/simple-peer/blob/f1a492d1999ce727fa87193ebdea20ac89c1fc6d/index.js#L955-L961
    Candidate(Candidate),
    // https://github.com/feross/simple-peer/blob/f1a492d1999ce727fa87193ebdea20ac89c1fc6d/index.js#L670-L673
    SdpAnswer(SdpAnswer),
    // https://github.com/feross/simple-peer/blob/f1a492d1999ce727fa87193ebdea20ac89c1fc6d/index.js#L620-L623
    SdpOffer(SdpOffer),
}

/// Parse a candidate string like "candidate:123 1 UDP 456 192.168.1.1 5000 typ host"
/// Returns None for mDNS candidates (*.local) or unparseable formats
fn parse_candidate_string(candidate_str: &str) -> Option<Candidate> {
    // Skip empty candidates (end-of-candidates signal)
    if candidate_str.is_empty() {
        return None;
    }

    // Skip mDNS candidates (contain .local addresses)
    if candidate_str.contains(".local") {
        return None;
    }

    // Skip TCP candidates (str0m only supports UDP)
    if candidate_str.to_lowercase().contains(" tcp ") {
        return None;
    }

    // Parse the candidate string
    // Format: "candidate:<foundation> <component> <protocol> <priority> <ip> <port> typ <type> ..."
    let parts: Vec<&str> = candidate_str.split_whitespace().collect();

    // Find IP and port (they come after priority, before "typ")
    let typ_pos = parts.iter().position(|&s| s == "typ")?;
    if typ_pos < 2 {
        return None;
    }

    let ip_str = parts.get(typ_pos - 2)?;
    let port_str = parts.get(typ_pos - 1)?;

    let ip: std::net::IpAddr = ip_str.parse().ok()?;
    let port: u16 = port_str.parse().ok()?;
    let addr = SocketAddr::new(ip, port);

    // Get candidate type
    let candidate_type = parts.get(typ_pos + 1)?;

    // Determine protocol (UDP only for now)
    let protocol = Protocol::Udp;

    match *candidate_type {
        "host" => Candidate::host(addr, protocol).ok(),
        "srflx" => {
            // For server reflexive, we need the raddr/rport
            // For now, use the same address as base
            Candidate::server_reflexive(addr, addr, protocol).ok()
        }
        "relay" => {
            // For relay candidates - str0m takes (addr, protocol) 
            Candidate::relayed(addr, protocol).ok()
        }
        _ => None,
    }
}

impl<'de> Deserialize<'de> for Signal {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // First, deserialize to a generic JSON value to handle multiple formats
        let value = serde_json::Value::deserialize(deserializer)?;

        // Check for renegotiate
        if let Some(renegotiate) = value.get("renegotiate") {
            if let Some(b) = renegotiate.as_bool() {
                return Ok(Signal::Renegotiate(b));
            }
        }

        // Check for SDP (offer or answer)
        if let Some(sdp) = value.get("sdp").and_then(|v| v.as_str()) {
            let signal_type = value.get("type").and_then(|v| v.as_str()).unwrap_or("");

            match signal_type {
                "offer" => {
                    let offer = SdpOffer::from_sdp_string(sdp).map_err(|e| {
                        serde::de::Error::custom(format!("Invalid SDP offer: {}", e))
                    })?;
                    return Ok(Signal::SdpOffer(offer));
                }
                "answer" => {
                    let answer = SdpAnswer::from_sdp_string(sdp).map_err(|e| {
                        serde::de::Error::custom(format!("Invalid SDP answer: {}", e))
                    })?;
                    return Ok(Signal::SdpAnswer(answer));
                }
                _ => {
                    return Err(serde::de::Error::custom(format!(
                        "Unknown SDP type: {}",
                        signal_type
                    )));
                }
            }
        }

        // Check for candidate - handle both flat and nested formats
        if let Some(candidate_value) = value.get("candidate") {
            // Flat format: {"type":"candidate", "candidate":"candidate:...", "sdpMLineIndex":0}
            if let Some(candidate_str) = candidate_value.as_str() {
                if let Some(candidate) = parse_candidate_string(candidate_str) {
                    return Ok(Signal::Candidate(candidate));
                } else {
                    return Err(serde::de::Error::custom(format!(
                        "Unparseable candidate: {}",
                        candidate_str
                    )));
                }
            }

            // Nested format: {"type":"candidate", "candidate":{"candidate":"...", ...}}
            if let Some(nested_str) = candidate_value.get("candidate").and_then(|v| v.as_str()) {
                if let Some(candidate) = parse_candidate_string(nested_str) {
                    return Ok(Signal::Candidate(candidate));
                } else {
                    return Err(serde::de::Error::custom(format!(
                        "Unparseable nested candidate: {}",
                        nested_str
                    )));
                }
            }
        }

        Err(serde::de::Error::custom(format!(
            "Unknown signal format: {}",
            value
        )))
    }
}

impl Serialize for Signal {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            Signal::Renegotiate(renegotiate) => {
                let mut state = serializer.serialize_struct("Signal", 2)?;
                state.serialize_field("type", "renegotiate")?;
                state.serialize_field("renegotiate", renegotiate)?;
                state.end()
            }
            Signal::Candidate(candidate) => {
                let mut state = serializer.serialize_struct("Signal", 2)?;
                state.serialize_field("type", "candidate")?;
                state.serialize_field("candidate", candidate)?;
                state.end()
            }
            Signal::SdpAnswer(sdp_answer) => {
                let mut state = serializer.serialize_struct("Signal", 2)?;
                state.serialize_field("type", "answer")?;
                state.serialize_field("sdp", &sdp_answer.to_sdp_string())?;
                state.end()
            }
            Signal::SdpOffer(sdp_offer) => {
                let mut state = serializer.serialize_struct("Signal", 2)?;
                state.serialize_field("type", "offer")?;
                state.serialize_field("sdp", &sdp_offer.to_sdp_string())?;
                state.end()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signal_deserialize_renegotiate() {
        let renegotiate = r#"{"type":"renegotiate","renegotiate":true}"#;
        let result = serde_json::from_str::<Signal>(renegotiate);
        assert!(result.is_ok(), "Failed to parse: {:?}", result.err());
    }

    #[test]
    fn signal_deserialize_candidate_nested() {
        // Nested format (simple-peer style)
        let signal = r#"{"candidate":{"candidate":"candidate:1523922347 1 udp 1677729535 92.224.36.18 55609 typ srflx raddr 0.0.0.0 rport 0 generation 0 ufrag mZ8f network-cost 999","sdpMLineIndex":0,"sdpMid":"0"},"type":"candidate"}"#;
        let result = serde_json::from_str::<Signal>(signal);
        assert!(result.is_ok(), "Failed to parse nested candidate: {:?}", result.err());
    }

    #[test]
    fn signal_deserialize_candidate_flat() {
        // Flat format (browser/PeerManager style)
        let signal = r#"{"type":"candidate","candidate":"candidate:1523922347 1 udp 1677729535 92.224.36.18 55609 typ srflx raddr 0.0.0.0 rport 0","sdpMLineIndex":0,"sdpMid":"0"}"#;
        let result = serde_json::from_str::<Signal>(signal);
        assert!(result.is_ok(), "Failed to parse flat candidate: {:?}", result.err());
    }

    #[test]
    fn signal_deserialize_candidate_host() {
        // Host candidate
        let signal = r#"{"type":"candidate","candidate":"candidate:338708421 1 udp 2113937151 192.168.1.100 59443 typ host","sdpMLineIndex":0,"sdpMid":"0"}"#;
        let result = serde_json::from_str::<Signal>(signal);
        assert!(result.is_ok(), "Failed to parse host candidate: {:?}", result.err());
    }

    #[test]
    fn signal_deserialize_candidate_mdns_fails() {
        // mDNS candidate should fail (they can't be parsed without resolution)
        let signal = r#"{"type":"candidate","candidate":"candidate:0 1 UDP 2122252543 bdfcfeab-15a9-4103-b05a-96eb19dd6ea2.local 59443 typ host","sdpMLineIndex":0,"sdpMid":"0"}"#;
        let result = serde_json::from_str::<Signal>(signal);
        assert!(result.is_err(), "mDNS candidate should fail to parse");
    }

    #[test]
    fn signal_deserialize_candidate_tcp_fails() {
        // TCP candidate should fail (str0m only supports UDP)
        let signal = r#"{"type":"candidate","candidate":"candidate:2 1 TCP 2105524479 192.168.1.100 9 typ host tcptype active","sdpMLineIndex":0,"sdpMid":"0"}"#;
        let result = serde_json::from_str::<Signal>(signal);
        assert!(result.is_err(), "TCP candidate should fail to parse");
    }

    #[test]
    fn signal_deserialize_candidate_empty_fails() {
        // Empty candidate (end-of-candidates signal) should fail
        let signal = r#"{"type":"candidate","candidate":"","sdpMLineIndex":0,"sdpMid":"0"}"#;
        let result = serde_json::from_str::<Signal>(signal);
        assert!(result.is_err(), "Empty candidate should fail to parse");
    }

    #[test]
    fn signal_deserialize_sdp_answer() {
        let answer = r#"{"type":"answer","sdp":"v=0\r\no=- 123 2 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:testpassword123456789012\r\na=ice-options:trickle\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:active\r\na=mid:0\r\na=sctp-port:5000\r\n"}"#;
        let result = serde_json::from_str::<Signal>(answer);
        assert!(result.is_ok(), "Failed to parse SDP answer: {:?}", result.err());
    }

    #[test]
    fn signal_deserialize_sdp_offer() {
        let offer = r#"{"type":"offer","sdp":"v=0\r\no=- 123 2 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:testpassword123456789012\r\na=ice-options:trickle\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\n"}"#;
        let result = serde_json::from_str::<Signal>(offer);
        assert!(result.is_ok(), "Failed to parse SDP offer: {:?}", result.err());
    }

    #[test]
    fn signal_serialize_renegotiate() {
        let renegotiate = Signal::Renegotiate(true);

        assert_eq!(
            serde_json::to_string(&renegotiate).unwrap(),
            r#"{"type":"renegotiate","renegotiate":true}"#
        );
    }

    #[test]
    fn signal_serialize_candidate() {
        let candidate = Signal::Candidate(
            Candidate::host("1.2.3.4:9876".parse().unwrap(), Protocol::Udp).unwrap(),
        );

        assert_eq!(
            serde_json::to_string(&candidate).unwrap(),
            r#"{"type":"candidate","candidate":{"candidate":"candidate:fffeff7e11fa5c45c89f25fe 1 udp 2130706175 1.2.3.4 9876 typ host","sdpMid":null,"sdpMLineIndex":0,"usernameFragment":null}}"#
        );
    }

    #[test]
    fn parse_candidate_string_host() {
        let candidate_str = "candidate:338708421 1 udp 2113937151 192.168.1.100 59443 typ host";
        let result = parse_candidate_string(candidate_str);
        assert!(result.is_some(), "Failed to parse host candidate");
    }

    #[test]
    fn parse_candidate_string_srflx() {
        let candidate_str = "candidate:1678944502 1 udp 1677729535 77.11.105.96 59443 typ srflx raddr 0.0.0.0 rport 0";
        let result = parse_candidate_string(candidate_str);
        assert!(result.is_some(), "Failed to parse srflx candidate");
    }

    #[test]
    fn parse_candidate_string_mdns() {
        let candidate_str = "candidate:0 1 UDP 2122252543 bdfcfeab-15a9-4103-b05a-96eb19dd6ea2.local 59443 typ host";
        let result = parse_candidate_string(candidate_str);
        assert!(result.is_none(), "mDNS candidate should return None");
    }

    #[test]
    fn parse_candidate_string_empty() {
        let candidate_str = "";
        let result = parse_candidate_string(candidate_str);
        assert!(result.is_none(), "Empty candidate should return None");
    }
}
