use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::address::Address;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SobakaMessage {
    pub addr: Address,
    pub args: Vec<SobakaType>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, TS)]
pub struct SobakaTime {
    pub seconds: u32,
    pub fractional: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
pub struct SobakaColor {
    pub red: u8,
    pub green: u8,
    pub blue: u8,
    pub alpha: u8,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
pub struct SobakaMidiMessage {
    pub port: u8,
    pub status: u8,
    pub data1: u8,
    pub data2: u8,
}

/// An OscArray color.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
pub struct SobakaArray {
    pub content: Vec<SobakaType>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
pub enum SobakaType {
    Int(i32),
    Float(f32),
    String(String),
    Blob(Vec<u8>),
    Time(SobakaTime),
    Long(i64),
    Double(f64),
    // Char(char),
    Color(SobakaColor),
    Midi(SobakaMidiMessage),
    Bool(bool),
    Array(SobakaArray),
    Nil,
    Inf,
}

#[cfg(feature = "osc")]
mod osc_interop {
    use std::{
        convert::{TryFrom, TryInto},
        str::FromStr,
    };

    use rosc::{OscArray, OscColor, OscMessage, OscMidiMessage, OscTime, OscType};

    use crate::interface::address::Address;

    use super::{
        SobakaArray, SobakaColor, SobakaMessage, SobakaMidiMessage, SobakaTime, SobakaType,
    };

    impl TryFrom<OscMessage> for SobakaMessage {
        type Error = &'static str;

        fn try_from(value: OscMessage) -> Result<Self, Self::Error> {
            Ok(SobakaMessage {
                addr: Address::from_str(&value.addr).map_err(|_| "Invalid address")?,
                args: value
                    .args
                    .into_iter()
                    .map(|osc| osc.try_into())
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|_| "Encountered invalid params")?,
            })
        }
    }

    impl TryFrom<OscType> for SobakaType {
        type Error = &'static str;

        fn try_from(value: OscType) -> Result<Self, Self::Error> {
            match value {
                OscType::Int(v) => Ok(SobakaType::Int(v)),
                OscType::Float(v) => Ok(SobakaType::Float(v)),
                OscType::String(v) => Ok(SobakaType::String(v)),
                OscType::Blob(v) => Ok(SobakaType::Blob(v)),
                OscType::Time(v) => Ok(SobakaType::Time(v.into())),
                OscType::Long(v) => Ok(SobakaType::Long(v)),
                OscType::Double(v) => Ok(SobakaType::Double(v)),
                // OscType::Char(v) => Ok(SobakaType::Char(v)),
                OscType::Color(v) => Ok(SobakaType::Color(v.into())),
                OscType::Midi(v) => Ok(SobakaType::Midi(v.into())),
                OscType::Bool(v) => Ok(SobakaType::Bool(v)),
                OscType::Array(v) => Ok(SobakaType::Array(v.try_into()?)),
                OscType::Nil => Ok(SobakaType::Nil),
                OscType::Inf => Ok(SobakaType::Inf),
                _ => Err("No type for")
            }
        }
    }

    impl From<OscTime> for SobakaTime {
        fn from(value: OscTime) -> Self {
            SobakaTime {
                seconds: value.seconds,
                fractional: value.fractional,
            }
        }
    }

    impl From<OscColor> for SobakaColor {
        fn from(value: OscColor) -> Self {
            SobakaColor {
                red: value.red,
                green: value.green,
                blue: value.blue,
                alpha: value.alpha,
            }
        }
    }

    impl From<OscMidiMessage> for SobakaMidiMessage {
        fn from(value: OscMidiMessage) -> Self {
            SobakaMidiMessage {
                port: value.port,
                status: value.status,
                data1: value.data1,
                data2: value.data2,
            }
        }
    }

    impl TryFrom<OscArray> for SobakaArray {
        type Error = &'static str;
        fn try_from(value: OscArray) -> Result<Self, Self::Error> {
            Ok(
                SobakaArray {
                content: value
                    .content
                    .into_iter()
                    .map(|osc| osc.try_into())
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|_| "Encountered invalid params")?,
            })
        }
    }
}
