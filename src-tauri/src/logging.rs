use std::{env, fs, io::Write, path::PathBuf};

use anyhow::Context;
use once_cell::sync::OnceCell;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

static LOG_GUARD: OnceCell<tracing_appender::non_blocking::WorkerGuard> = OnceCell::new();

fn default_app_name() -> &'static str {
    "cash-dial-desktop"
}

pub fn log_dir() -> anyhow::Result<PathBuf> {
    if let Ok(dir) = env::var("LOG_DIR") {
        let p = PathBuf::from(dir);
        fs::create_dir_all(&p).context("creating log dir from LOG_DIR")?;
        return Ok(p);
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = env::var("APPDATA") {
            let p = PathBuf::from(appdata).join(default_app_name()).join("logs");
            fs::create_dir_all(&p).context("creating windows log dir")?;
            return Ok(p);
        }
    }

    if let Ok(home) = env::var("HOME") {
        // macOS
        #[cfg(target_os = "macos")]
        {
            let p = PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join(default_app_name())
                .join("logs");
            fs::create_dir_all(&p).context("creating macos log dir")?;
            return Ok(p);
        }

        // linux and others
        #[cfg(not(target_os = "macos"))]
        {
            let p = PathBuf::from(home)
                .join(".local")
                .join("share")
                .join(default_app_name())
                .join("logs");
            fs::create_dir_all(&p).context("creating linux log dir")?;
            return Ok(p);
        }
    }

    Err(anyhow::anyhow!("Could not determine log directory"))
}

pub fn init_logging() -> anyhow::Result<()> {
    let log_dir = log_dir()?;

    // rotation: daily
    let file_appender = tracing_appender::rolling::daily(&log_dir, "app.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    // keep guard alive for process lifetime
    LOG_GUARD.set(guard).ok();

    let level = env::var("LOG_LEVEL").unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            "debug".into()
        } else {
            "info".into()
        }
    });

    let env_filter = EnvFilter::try_new(level.clone()).unwrap_or_else(|_| EnvFilter::new("info"));

    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .with_target(false)
        .with_level(true)
        .with_line_number(true);

    if cfg!(debug_assertions) {
        // also log to stdout in development
        tracing_subscriber::registry()
            .with(env_filter)
            .with(file_layer)
            .with(fmt::layer())
            .try_init()
            .ok();
    } else {
        tracing_subscriber::registry().with(env_filter).with(file_layer).try_init().ok();
    }

    tracing::info!("Logging initialized");

    Ok(())
}

pub fn export_logs_zip() -> anyhow::Result<PathBuf> {
    use std::fs::File;
    use std::io::Read;
    use zip::write::FileOptions;

    let log_dir = log_dir()?;
    let tmp = env::temp_dir();
    let ts = chrono::Utc::now().format("%Y%m%d%H%M%S");
    let out_path = tmp.join(format!("{}-logs-{}.zip", default_app_name(), ts));

    let file = File::create(&out_path).context("creating zip file")?;
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in walkdir::WalkDir::new(&log_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        let name =
            path.strip_prefix(&log_dir).map_err(|error| anyhow::anyhow!(error))?.to_string_lossy();
        zip.start_file(name.replace("\\", "/"), options).context("starting file in zip")?;
        let mut f = File::open(path).context("opening log file")?;
        let mut buffer = Vec::new();
        f.read_to_end(&mut buffer).context("reading log file")?;
        zip.write_all(&buffer).context("writing to zip")?;
    }

    zip.finish().context("finishing zip")?;

    Ok(out_path)
}
