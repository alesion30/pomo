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
type CategoryCache = Option<(u64, Option<std::time::SystemTime>, Vec<String>)>;
pub struct StateStore {
    pub latest: Mutex<Persisted>,
    pub dir: PathBuf,
    categories: Mutex<CategoryCache>,
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
            categories: Mutex::new(None),
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
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn recent_categories(&self) -> Result<Vec<String>, String> {
        let path = self.dir.join("sessions.jsonl");
        let metadata = fs::metadata(&path).ok();
        let key = metadata.as_ref().map(|m| (m.len(), m.modified().ok()));
        let mut cache = self.categories.lock().map_err(|e| e.to_string())?;
        if let Some((length, modified, values)) = &*cache
            && key
                .as_ref()
                .is_some_and(|(len, time)| len == length && time == modified)
        {
            return Ok(values.clone());
        }
        #[derive(Deserialize)]
        struct CategoryLine {
            category: Option<String>,
        }
        let mut ordered = Vec::new();
        let mut seen = std::collections::HashSet::new();
        // 行ごとに読むので、手編集などで UTF-8 として壊れた行があってもその行だけを飛ばせる。
        if let Ok(contents) = fs::read(&path) {
            for line in contents.split(|b| *b == b'\n').rev() {
                if let Ok(item) = serde_json::from_slice::<CategoryLine>(line)
                    && let Some(category) = item.category.filter(|s| !s.is_empty())
                    && seen.insert(category.clone())
                {
                    ordered.push(category);
                }
            }
        }
        *cache = key.map(|(length, modified)| (length, modified, ordered.clone()));
        Ok(ordered)
    }
    pub fn save(
        &self,
        app: AppHandle,
        state: serde_json::Value,
        schedule: Option<Schedule>,
        base_revision: Option<u64>,
    ) -> Result<u64, String> {
        // 版番号の採番からファイルの置き換えまでを 1 つのロックで行い、保存の順序を固定する。
        let mut latest = self.latest.lock().map_err(|e| e.to_string())?;
        // 2 つのウィンドウが別々に状態全体を保存するので、元にした版が古い保存は拒否する。
        // 受け入れると、もう一方のウィンドウの変更を黙って上書きして消してしまう。
        if base_revision.is_some_and(|base| base != latest.revision) {
            return Err(format!(
                "conflict: base {base_revision:?}, current {}",
                latest.revision
            ));
        }
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
    app: AppHandle,
    store: tauri::State<'_, StateStore>,
    record: serde_json::Value,
) -> Result<(), String> {
    store.append(record)?;
    app.emit("records-changed", ()).map_err(|e| e.to_string())
}
#[tauri::command]
pub fn save_state(
    app: AppHandle,
    store: tauri::State<'_, StateStore>,
    state: serde_json::Value,
    schedule: Option<Schedule>,
    base_revision: Option<u64>,
) -> Result<u64, String> {
    store.save(app, state, schedule, base_revision)
}
#[tauri::command]
pub fn load_state(store: tauri::State<'_, StateStore>) -> Result<Persisted, String> {
    store
        .latest
        .lock()
        .map(|s| s.clone())
        .map_err(|e| e.to_string())
}

// 1 万行のログを読み直すと数十 ms かかるので、メインスレッドを止めないよう非同期で動かす。
#[tauri::command(async)]
pub fn recent_categories(store: tauri::State<'_, StateStore>) -> Result<Vec<String>, String> {
    store.recent_categories()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recent_categories_are_unique_ordered_and_skip_malformed_lines() {
        let dir = std::env::temp_dir().join(format!(
            "pomo-categories-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("sessions.jsonl"), b"{\"category\":\"old\",\"extra\":1}\n\xff\xfe broken\nnot json\n{\"category\":null}\n{\"category\":\"new\"}\n{\"category\":\"old\"}\n{\"category\":\"\"}\n").unwrap();
        let store = StateStore::new(dir.clone());
        assert_eq!(store.recent_categories().unwrap(), vec!["old", "new"]);
        fs::remove_dir_all(dir).unwrap();
    }
}
