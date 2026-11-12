use crate::schedule::Schedule;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::Mutex,
};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Deserialize, Serialize)]
pub struct Persisted {
    pub app: serde_json::Value,
    pub schedule: Option<Schedule>,
    #[serde(default)]
    pub revision: u64,
}
pub struct StateStore {
    pub latest: Mutex<Persisted>,
    pub dir: PathBuf,
}

impl StateStore {
    pub fn new(dir: PathBuf) -> Self {
        let latest = fs::read(dir.join("state.json"))
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or(Persisted {
                app: serde_json::Value::Null,
                schedule: None,
                revision: 0,
            });
        Self {
            latest: Mutex::new(latest),
            dir,
        }
    }
    pub fn append(&self, record: serde_json::Value) -> Result<(), String> {
        fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let mut bytes = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
        bytes.push(b'\n');
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.dir.join("sessions.jsonl"))
            .and_then(|mut f| f.write_all(&bytes))
            .map_err(|e| e.to_string())
    }
    pub fn save(
        &self,
        app: AppHandle,
        state: serde_json::Value,
        schedule: Option<Schedule>,
    ) -> Result<u64, String> {
        // 版番号の採番からファイルの置き換えまでを 1 つのロックで行い、保存の順序を固定する。
        let mut latest = self.latest.lock().map_err(|e| e.to_string())?;
        let persisted = Persisted {
            app: state,
            schedule,
            revision: latest.revision + 1,
        };
        fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let temp = self.dir.join("state.json.tmp");
        let bytes = serde_json::to_vec(&persisted).map_err(|e| e.to_string())?;
        File::create(&temp)
            .and_then(|mut f| f.write_all(&bytes).and_then(|_| f.sync_all()))
            .map_err(|e| e.to_string())?;
        fs::rename(temp, self.dir.join("state.json")).map_err(|e| e.to_string())?;
        *latest = persisted.clone();
        drop(latest);
        crate::set_schedule(&app, persisted.schedule.clone());
        app.emit("state-changed", &persisted)
            .map_err(|e| e.to_string())?;
        Ok(persisted.revision)
    }
}

#[tauri::command]
pub fn append_record(
    store: tauri::State<'_, StateStore>,
    record: serde_json::Value,
) -> Result<(), String> {
    store.append(record)
}
#[tauri::command]
pub fn save_state(
    app: AppHandle,
    store: tauri::State<'_, StateStore>,
    state: serde_json::Value,
    schedule: Option<Schedule>,
) -> Result<u64, String> {
    store.save(app, state, schedule)
}
#[tauri::command]
pub fn load_state(store: tauri::State<'_, StateStore>) -> Result<Persisted, String> {
    store
        .latest
        .lock()
        .map(|s| s.clone())
        .map_err(|e| e.to_string())
}
