use std::env::current_dir;
use std::fs::{create_dir_all, write};
use std::path::Path;

use jsonrpc_core::serde_json;
use schemars::{schema::RootSchema, schema_for};
use sobaka_sample_web_audio::module::api::{InputTypeDTO, ModuleStateDTO, ModuleType};

/// Generate JSON schema from types
/// Schemas can be converted to TypeScript with quicktype
/// @todo similar enums get merged - https://github.com/quicktype/quicktype/issues/1678

fn main() {
    let mut pwd = current_dir().unwrap();
    pwd.push("pkg");
    create_dir_all(&pwd).unwrap();

    let schema = schema_for!(ModuleType);
    export_schema(&schema, &pwd, "sobaka_sample_web_audio_module_type.json");

    let schema = schema_for!(ModuleStateDTO);
    export_schema(&schema, &pwd, "sobaka_sample_web_audio_state_dto.json");

    let schema = schema_for!(InputTypeDTO);
    export_schema(&schema, &pwd, "sobaka_sample_web_audio_input_type_dto.json");
}

// panics if any error writing out the schema
// overwrites any existing schema
fn export_schema(schema: &RootSchema, dir: &Path, name: &str) {
    let path = dir.join(name);
    let json = serde_json::to_string_pretty(schema).unwrap();
    write(&path, json + "\n").unwrap();
    println!("{}", path.to_str().unwrap());
}
