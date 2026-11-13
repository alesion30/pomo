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

fn timer_is_idle(app: &tauri::AppHandle) -> Result<bool, String> {
    Ok(app
        .state::<crate::store::StateStore>()
        .latest
        .lock()
        .map_err(|error| error.to_string())?
        .app
        .pointer("/timer/phase")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("idle")
        == "idle")
}

#[tauri::command]
pub async fn apply_update(app: tauri::AppHandle) -> Result<(), String> {
    if !timer_is_idle(&app)? {
        return Err("更新は待機中に適用できます".into());
    }
    let update = app
        .state::<AvailableUpdate>()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .take()
        .ok_or_else(|| "適用できる更新がありません".to_string())?;
    // ダウンロードで署名を検証し、入れ替える直前に待機中かを確かめ直す。ダウンロード中に集中を始めていたら入れ替えない。
    let result = match update.download(|_, _| {}, || {}).await {
        Ok(bytes) if timer_is_idle(&app)? => update.install(bytes).map_err(|e| e.to_string()),
        Ok(_) => Err("更新は待機中に適用できます".into()),
        Err(error) => Err(error.to_string()),
    };
    if let Err(message) = result {
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
        if let Err(error) = check(&app).await {
            eprintln!("update check failed: {error}");
        }
    });
}

async fn check(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    let Some(update) = update else {
        return Ok(None);
    };
    let version = update.version.clone();
    if let Ok(mut available) = app.state::<AvailableUpdate>().0.lock() {
        *available = Some(update);
    }
    let _ = app.emit("update-available", &version);
    Ok(Some(version))
}

/// 設定画面の「アップデートを確認」から呼ぶ。見つかった更新は定期の確認と同じく右下の表示にも出す。
#[tauri::command]
pub async fn check_update(app: tauri::AppHandle) -> Result<Option<String>, String> {
    check(&app).await
}
