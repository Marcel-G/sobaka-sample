use xtask_waw::{anyhow::Result, clap};

#[derive(clap::Parser)]
enum Opt {
    Dist(xtask_waw::Dist),
}

fn main() -> Result<()> {
    let opt: Opt = clap::Parser::parse();

    match opt {
        Opt::Dist(dist) => {
            dist.dist_dir_path("pkg")
                .app_name("sobaka-worklet")
                .release(true)
                .run_in_workspace(true)
                .run("sobaka-worklet")?;
        }
    }

    Ok(())
}
