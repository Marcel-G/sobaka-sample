use crate::graph::NodeIndex;
use serde::{de, Deserialize, Deserializer, Serialize};
use std::{
    fmt::{self, Display},
    str::FromStr,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvalidTargetError;

impl fmt::Display for InvalidTargetError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "invalid target")
    }
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Port {
    Output(usize),
    Input(usize),
}

impl FromStr for Port {
    type Err = InvalidTargetError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.split('-').collect::<Vec<_>>()[..] {
            ["in", n] => Ok(Port::Input(
                n.parse::<usize>().map_err(|_| InvalidTargetError)?,
            )),
            ["out", n] => Ok(Port::Output(
                n.parse::<usize>().map_err(|_| InvalidTargetError)?,
            )),
            _ => Err(InvalidTargetError),
        }
    }
}

impl Display for Port {
    fn fmt(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Port::Output(n) => formatter.write_fmt(format_args!("out-{}", n)),
            Port::Input(n) => formatter.write_fmt(format_args!("in-{}", n)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvalidAddressError;

impl fmt::Display for InvalidAddressError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "invalid address")
    }
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct Address {
    pub id: usize,
    pub port: Option<Port>,
}

impl FromStr for Address {
    type Err = InvalidAddressError;
    fn from_str(str: &str) -> Result<Self, Self::Err> {
        let parts = str
            .split('/')
            .filter(|&x| !x.is_empty())
            .collect::<Vec<_>>();

        match parts[..] {
            ["sobaka", id, target] => Ok(Address {
                id: id.parse::<usize>().map_err(|_| InvalidAddressError)?,
                port: Some(Port::from_str(target).map_err(|_| InvalidAddressError)?),
            }),
            ["sobaka", id] => Ok(Address {
                id: id.parse::<usize>().map_err(|_| InvalidAddressError)?,
                port: None,
            }),
            _ => Err(InvalidAddressError),
        }
    }
}

impl Display for Address {
    fn fmt(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        match &self.port {
            Some(port) => formatter.write_fmt(format_args!(
                "/sobaka/{id}/{port}",
                id = self.id,
                port = port
            )),
            None => formatter.write_fmt(format_args!("/sobaka/{id}", id = self.id)),
        }
    }
}

impl<'de> Deserialize<'de> for Address {
    fn deserialize<D>(deserializer: D) -> Result<Address, D::Error>
    where
        D: Deserializer<'de>,
    {
        String::deserialize(deserializer)?
            .parse()
            .map_err(de::Error::custom)
    }
}

impl Serialize for Address {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.collect_str(self)
    }
}

impl From<NodeIndex> for Address {
    fn from(id: NodeIndex) -> Self {
        Address {
            id: id.index(),
            port: None,
        }
    }
}

impl From<Address> for NodeIndex {
    fn from(address: Address) -> Self {
        NodeIndex::new(address.id)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use crate::interface::address::{Address, InvalidAddressError};

    use super::Port;

    #[test]
    fn parsing_address() {
        // With output target
        assert_eq!(
            Address::from_str("/sobaka/54/out-0/").unwrap(),
            Address {
                id: 54,
                port: Some(Port::Output(0))
            }
        );

        // With input target
        assert_eq!(
            Address::from_str("/sobaka/100/in-99").unwrap(),
            Address {
                id: 100,
                port: Some(Port::Input(99))
            }
        );

        // No target specified
        assert_eq!(
            Address::from_str("/sobaka/54").unwrap(),
            Address { id: 54, port: None }
        );

        // Invalid module id
        assert_eq!(
            Address::from_str("/akabos/abcde").unwrap_err(),
            InvalidAddressError
        );

        // Invalid target
        assert_eq!(
            Address::from_str("/sobaka/100/10").unwrap_err(),
            InvalidAddressError
        );
    }

    #[test]
    fn serialize_address() {
        // With output target
        assert_eq!(
            format!(
                "{}",
                Address {
                    id: 44,
                    port: Some(Port::Output(0))
                }
            ),
            "/sobaka/44/out-0"
        );

        // With input target
        assert_eq!(
            format!(
                "{}",
                Address {
                    id: 44,
                    port: Some(Port::Input(0))
                }
            ),
            "/sobaka/44/in-0"
        );

        // With missing target
        assert_eq!(format!("{}", Address { id: 44, port: None }), "/sobaka/44");
    }
}
