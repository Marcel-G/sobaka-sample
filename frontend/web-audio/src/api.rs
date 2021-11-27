use jsonrpc_derive::rpc;
use jsonrpc_core::{ Result };

#[rpc(server)]
pub trait Rpc {
    type Metadata;

    /// Returns a protocol version.
    #[rpc(name = "protocol_version")]
    fn protocol_version(&self) -> Result<String>;
}