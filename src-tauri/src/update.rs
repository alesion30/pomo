use std::sync::Mutex;

use tauri::{Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

pub struct AvailableUpdate(pub Mutex<Option<Update>>);

#[tauri::command]
pub fn update_status(update: tauri::State<'_, AvailableUpdate>) -> Option<String> {
    update
        .0
        .lock()
        .ok()?
        .as_ref()
        .map(|update| update.version.clone())
}

#[tauri::command]
pub async fn apply_update(app: tauri::AppHandle) -> Result<(), String> {
    let phase = app
        .state::<crate::store::StateStore>()
        .latest
        .lock()
        .map_err(|error| error.to_string())?
        .app
        .pointer("/timer/phase")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("idle")
        .to_owned();
    if phase != "idle" {
        return Err("更新は待機中に適用できます".into());
    }

    let update = app
        .state::<AvailableUpdate>()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .take()
        .ok_or_else(|| "適用できる更新がありません".to_string())?;
    if let Err(error) = update.download_and_install(|_, _| {}, || {}).await {
        let message = error.to_string();
        if let Ok(mut available) = app.state::<AvailableUpdate>().0.lock() {
            *available = Some(update);
        }
        return Err(message);
    }
    app.restart();
}

pub fn start_checks(app: tauri::AppHandle) {
    let periodic = app.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(6 * 60 * 60));
            schedule_check(app.clone());
        }
    });
    schedule_check(periodic);
}

fn schedule_check(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let checked = match app.updater() {
            Ok(updater) => updater.check().await,
            Err(error) => Err(error),
        };
        match checked {
            Ok(Some(update)) => {
                let version = update.version.clone();
                if let Ok(mut available) = app.state::<AvailableUpdate>().0.lock() {
                    *available = Some(update);
                }
                let _ = app.emit("update-available", version);
            }
            Ok(None) => {}
            Err(error) => eprintln!("update check failed: {error}"),
        }
    });
}
