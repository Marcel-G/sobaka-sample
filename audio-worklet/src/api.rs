use jsonrpc_core::Result;
use jsonrpc_derive::rpc;

#[rpc(server)]
pub trait Rpc {
    type Metadata;

    /// Returns a protocol version.
    #[rpc(name = "protocol_version")]
    fn protocol_version(&self) -> Result<String>;
}
