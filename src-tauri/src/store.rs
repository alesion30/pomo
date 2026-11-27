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
    // 追記と書き換えを直列にする。書き換えの途中の追記は、置き換えたファイルから消えてしまうため。
    records: Mutex<()>,
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
            records: Mutex::new(()),
        }
    }
    fn records_path(&self) -> PathBuf {
        self.dir.join("sessions.jsonl")
    }
    pub fn append(&self, record: serde_json::Value) -> Result<(), String> {
        let _guard = self.records.lock().map_err(|e| e.to_string())?;
        fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let mut bytes = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
        bytes.push(b'\n');
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.records_path())
            .and_then(|mut f| f.write_all(&bytes))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// 読めない行は飛ばす。手で編集して壊れた行があっても、残りの記録は見られるようにするため。
    pub fn list(&self) -> Result<Vec<serde_json::Value>, String> {
        let _guard = self.records.lock().map_err(|e| e.to_string())?;
        Ok(self
            .read_lines()?
            .iter()
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect())
    }

    fn read_lines(&self) -> Result<Vec<String>, String> {
        match fs::read_to_string(self.records_path()) {
            Ok(text) => Ok(text
                .lines()
                .filter(|line| !line.trim().is_empty())
                .map(str::to_owned)
                .collect()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(vec![]),
            Err(error) => Err(error.to_string()),
        }
    }

    /// 同じ id の行を置き換え、なければ末尾に足す。record が None なら id の行を消す。
    /// 他の行は、読めない行も含めて元の文字列のまま残す。
    pub fn rewrite(&self, id: &str, record: Option<serde_json::Value>) -> Result<(), String> {
        let _guard = self.records.lock().map_err(|e| e.to_string())?;
        let mut lines = self.read_lines()?;
        let same_id = |line: &String| {
            serde_json::from_str::<serde_json::Value>(line)
                .ok()
                .is_some_and(|v| v.get("id").and_then(|v| v.as_str()) == Some(id))
        };
        let replacement = record
            .map(|r| serde_json::to_string(&r))
            .transpose()
            .map_err(|e| e.to_string())?;
        match (lines.iter().position(same_id), replacement) {
            (Some(index), Some(line)) => lines[index] = line,
            (Some(index), None) => {
                lines.remove(index);
            }
            (None, Some(line)) => lines.push(line),
            (None, None) => return Err(format!("record {id} not found")),
        }
        fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let temp = self.dir.join("sessions.jsonl.tmp");
        let mut bytes = lines.join("\n").into_bytes();
        if !bytes.is_empty() {
            bytes.push(b'\n');
        }
        File::create(&temp)
            .and_then(|mut f| f.write_all(&bytes).and_then(|_| f.sync_all()))
            .map_err(|e| e.to_string())?;
        fs::rename(temp, self.records_path()).map_err(|e| e.to_string())
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

// 履歴の画面が開いていれば読み直せるよう、記録が変わるたびに知らせる。
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
pub fn list_records(store: tauri::State<'_, StateStore>) -> Result<Vec<serde_json::Value>, String> {
    store.list()
}
#[tauri::command]
pub fn put_record(
    app: AppHandle,
    store: tauri::State<'_, StateStore>,
    record: serde_json::Value,
) -> Result<(), String> {
    let id = record
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or("record without id")?
        .to_owned();
    store.rewrite(&id, Some(record))?;
    app.emit("records-changed", ()).map_err(|e| e.to_string())
}
#[tauri::command]
pub fn delete_record(
    app: AppHandle,
    store: tauri::State<'_, StateStore>,
    id: String,
) -> Result<(), String> {
    store.rewrite(&id, None)?;
    app.emit("records-changed", ()).map_err(|e| e.to_string())
}
// 打鍵のたびに呼ばれ、fsync で数 ms かかる。同期のコマンドはメインスレッドで動き、その間キー入力の処理が止まるので、別スレッドで動かす。
#[tauri::command(async)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn store(name: &str) -> StateStore {
        let dir = std::env::temp_dir().join(format!(
            "pomo-records-{name}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        StateStore::new(dir)
    }

    #[test]
    fn replaces_appends_and_deletes_by_id_keeping_unreadable_lines() {
        let s = store("rewrite");
        s.append(json!({"id": "a", "title": "one"})).unwrap();
        fs::write(
            s.records_path(),
            format!(
                "{}broken line\n",
                fs::read_to_string(s.records_path()).unwrap()
            ),
        )
        .unwrap();
        s.append(json!({"id": "b", "title": "two"})).unwrap();
        s.rewrite("a", Some(json!({"id": "a", "title": "edited"})))
            .unwrap();
        s.rewrite("c", Some(json!({"id": "c", "title": "added"})))
            .unwrap();
        s.rewrite("b", None).unwrap();
        assert!(s.rewrite("missing", None).is_err());
        assert_eq!(
            fs::read_to_string(s.records_path()).unwrap(),
            "{\"id\":\"a\",\"title\":\"edited\"}\nbroken line\n{\"id\":\"c\",\"title\":\"added\"}\n"
        );
        let titles: Vec<_> = s
            .list()
            .unwrap()
            .iter()
            .map(|r| r["title"].clone())
            .collect();
        assert_eq!(titles, vec![json!("edited"), json!("added")]);
    }

    #[test]
    fn lists_nothing_without_a_file() {
        assert!(store("empty").list().unwrap().is_empty());
    }
}
