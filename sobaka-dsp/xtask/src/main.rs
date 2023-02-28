use std::{fs, path::Path};

use xtask_waw::{anyhow::Result, clap, WasmOpt};

#[derive(clap::Parser)]
struct Opt {
    #[clap(long = "log", default_value = "Info")]
    log_level: log::LevelFilter,
    #[clap(subcommand)]
    cmd: Command,
}

#[derive(clap::Parser)]
enum Command {
    Dist(Build),
}

#[derive(clap::Parser)]
struct Build {
    /// Optimize the generated package using `wasm-opt`.
    #[clap(long)]
    optimize: bool,

    #[clap(flatten)]
    base: xtask_waw::Dist,
}
fn main() -> Result<()> {
    let opt: Opt = clap::Parser::parse();

    env_logger::builder()
        .filter(Some("xtask"), opt.log_level)
        .init();

    match opt.cmd {
        Command::Dist(arg) => {
            let package_name = "sobaka-worklet";
            let dist_result = arg
                .base
                .dist_dir_path("pkg")
                .app_name(package_name)
                .release(true)
                .shared_memory(true)
                .run_in_workspace(true)
                .run(package_name)?;

            let worker_entry = dist_result
                .dist_dir
                .join(format!("{package_name}.worker.entry.js"));

            let worker_final = dist_result
                .dist_dir
                .join(format!("{package_name}.worker.js"));

            fs::write(
                &worker_entry,
                generate_worklet_entry(dist_result.main_js.strip_prefix(&dist_result.dist_dir)?),
            )?;

            fs::copy(&worker_entry, worker_final)?;
            fs::remove_file(&worker_entry)?;

            if arg.optimize {
                WasmOpt::level(3).shrink(2).optimize(dist_result.wasm)?;
            }
        }
    }

    Ok(())
}

fn generate_worklet_entry(main_js: &Path) -> String {
    let boilerplate = include_str!("./worker.entry.js");
    let path = main_js.to_str().unwrap();

    format!(
        "
        import init, * as bindgen from \"./{path}\";
        {boilerplate}
    "
    )
}
