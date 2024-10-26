use serde::{ser::SerializeStruct, Deserialize, Deserializer, Serialize};
use str0m::{
    change::{SdpAnswer, SdpOffer},
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

impl<'de> Deserialize<'de> for Signal {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(untagged)]
        pub enum Wrapper {
            Renegotiate {
                #[serde(rename = "type")]
                _type: String,
                renegotiate: bool,
            },
            Candidate {
                #[serde(rename = "type")]
                _type: String,
                candidate: Candidate,
            },
            SdpAnswer(SdpAnswer),
            SdpOffer(SdpOffer),
        }
        Wrapper::deserialize(deserializer).map(|w| match w {
            Wrapper::Renegotiate { _type, renegotiate } => Signal::Renegotiate(renegotiate),
            Wrapper::Candidate { _type, candidate } => Signal::Candidate(candidate),
            Wrapper::SdpAnswer(answer) => Signal::SdpAnswer(answer),
            Wrapper::SdpOffer(offer) => Signal::SdpOffer(offer),
        })
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
    use crate::peer::signal::Signal;
    use str0m::{change::SdpAnswer, net::Protocol, Candidate};

    #[test]
    fn signal_deserialize_renegotiate() {
        let renegotiate = r#"{"type":"renegotiate","renegotiate":true}"#;

        assert!(serde_json::from_str::<Signal>(renegotiate).is_ok());
    }

    #[test]
    fn signal_deserialize_candidate() {
        let signal = r#"{"candidate":{"candidate":"candidate:1523922347 1 udp 1677729535 92.224.36.18 55609 typ srflx raddr 0.0.0.0 rport 0 generation 0 ufrag mZ8f network-cost 999","sdpMLineIndex":0,"sdpMid":"0"},"type":"candidate"}"#;

        assert!(serde_json::from_str::<Signal>(signal).is_ok());
    }

    #[test]
    fn signal_deserialize_sdp_answer() {
        let answer = r#"{ "type":"answer","sdp":"v=0\r\no=str0m-{VERSION} 123 2 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n" }"#;

        assert!(serde_json::from_str::<Signal>(answer).is_ok());
    }

    #[test]
    fn signal_deserialize_sdp_offer() {
        let offer = r#"{ "type":"offer","sdp":"v=0\r\no=str0m-{VERSION} 123 2 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n" }"#;

        assert!(serde_json::from_str::<Signal>(offer).is_ok());
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
            r#"{"type":"candidate","candidate":{"candidate":"candidate:1295449297610810878 1 udp 2130706175 1.2.3.4 9876 typ host","sdpMid":null,"sdpMLineIndex":0,"usernameFragment":null}}"#
        );
    }
}
