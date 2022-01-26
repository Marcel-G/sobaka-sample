use std::env::current_dir;
use std::fs::{create_dir_all, write};
use std::path::Path;

use jsonrpc_core::serde_json;
use schemars::{schema::RootSchema, schema_for};
use sobaka_sample_audio_worklet::graph_rpc::api::{
    NodeEventDTO, NodeInputTypeDTO, NodeStateDTO, NodeType,
};

/// Generate JSON schema from types
/// Schemas can be converted to TypeScript with quicktype
/// @todo similar enums get merged - https://github.com/quicktype/quicktype/issues/1678

fn main() {
    let mut pwd = current_dir().unwrap();
    pwd.push("schema");
    create_dir_all(&pwd).unwrap();

    let schema = schema_for!(NodeType);
    export_schema(&schema, &pwd, "sobaka_sample_audio_worklet_node_type.json");

    let schema = schema_for!(NodeStateDTO);
    export_schema(
        &schema,
        &pwd,
        "sobaka_sample_audio_worklet_node_state_dto.json",
    );

    let schema = schema_for!(NodeInputTypeDTO);
    export_schema(
        &schema,
        &pwd,
        "sobaka_sample_audio_worklet_node_input_type_dto.json",
    );

    let schema = schema_for!(NodeEventDTO);
    export_schema(
        &schema,
        &pwd,
        "sobaka_sample_audio_worklet_node_event_dto.json",
    );
}

// panics if any error writing out the schema
// overwrites any existing schema
fn export_schema(schema: &RootSchema, dir: &Path, name: &str) {
    let path = dir.join(name);
    let json = serde_json::to_string_pretty(schema).unwrap();
    write(&path, json + "\n").unwrap();
    println!("{}", path.to_str().unwrap());
}
