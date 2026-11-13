use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::{ErrorKind, Write},
    path::PathBuf,
    sync::Mutex,
};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct Config {
    #[serde(default)]
    pub categories: Vec<String>,
    // 手で足したキーは、アプリから保存しても消さない。
    #[serde(flatten)]
    pub rest: serde_json::Map<String, serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct ConfigView {
    pub categories: Vec<String>,
    pub error: Option<String>,
}

pub struct ConfigStore {
    path: PathBuf,
    last_good: Mutex<Config>,
}

impl ConfigStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            last_good: Mutex::new(Config::default()),
        }
    }

    fn read(&self) -> Result<Config, String> {
        match fs::read(&self.path) {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .map_err(|error| format!("config.json を読めません: {error}")),
            Err(error) if error.kind() == ErrorKind::NotFound => {
                let config = Config::default();
                self.write(&config)?;
                Ok(config)
            }
            Err(error) => Err(format!("config.json を読めません: {error}")),
        }
    }

    fn write(&self, config: &Config) -> Result<(), String> {
        if let Some(dir) = self.path.parent() {
            fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        let mut bytes = serde_json::to_vec_pretty(config).map_err(|e| e.to_string())?;
        bytes.push(b'\n');
        let temp = self.path.with_extension("json.tmp");
        File::create(&temp)
            .and_then(|mut f| f.write_all(&bytes).and_then(|_| f.sync_all()))
            .map_err(|e| e.to_string())?;
        fs::rename(temp, &self.path).map_err(|e| e.to_string())
    }

    /// 壊れていたら、前に読めた内容とエラーを返す。手で編集している途中でもタイマーを使えるようにするため。
    pub fn load(&self) -> ConfigView {
        let mut last = self.last_good.lock().unwrap();
        match self.read() {
            Ok(config) => {
                *last = config;
                ConfigView {
                    categories: last.categories.clone(),
                    error: None,
                }
            }
            Err(error) => ConfigView {
                categories: last.categories.clone(),
                error: Some(error),
            },
        }
    }

    /// 壊れたファイルは上書きしない。手で編集した内容を、前に読めた内容で消してしまうため。
    pub fn save_categories(&self, categories: Vec<String>) -> Result<ConfigView, String> {
        let mut last = self.last_good.lock().unwrap();
        let mut config = self.read()?;
        config.categories = normalize(categories);
        self.write(&config)?;
        *last = config;
        Ok(ConfigView {
            categories: last.categories.clone(),
            error: None,
        })
    }

    pub fn path(&self) -> &PathBuf {
        &self.path
    }
}

fn normalize(categories: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    categories
        .into_iter()
        .map(|c| c.trim().to_owned())
        .filter(|c| !c.is_empty() && seen.insert(c.clone()))
        .collect()
}

#[tauri::command]
pub fn load_config(store: tauri::State<'_, ConfigStore>) -> ConfigView {
    store.load()
}

#[tauri::command]
pub fn save_categories(
    store: tauri::State<'_, ConfigStore>,
    categories: Vec<String>,
) -> Result<ConfigView, String> {
    store.save_categories(categories)
}

#[tauri::command]
pub fn reveal_config(store: tauri::State<'_, ConfigStore>) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(store.path())
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "pomo-config-{name}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        dir.join("pomo/config.json")
    }

    #[test]
    fn creates_an_empty_config_when_missing() {
        let path = temp_path("missing");
        let store = ConfigStore::new(path.clone());
        assert_eq!(
            store.load(),
            ConfigView {
                categories: vec![],
                error: None
            }
        );
        let written: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(written, serde_json::json!({ "categories": [] }));
    }

    #[test]
    fn keeps_the_last_good_categories_while_broken_and_refuses_to_save() {
        let path = temp_path("broken");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, r#"{"categories": ["開発", "レビュー"]}"#).unwrap();
        let store = ConfigStore::new(path.clone());
        assert_eq!(store.load().categories, vec!["開発", "レビュー"]);
        fs::write(&path, r#"{"categories": ["開発",#"#).unwrap();
        let view = store.load();
        assert_eq!(view.categories, vec!["開発", "レビュー"]);
        assert!(view.error.is_some());
        assert!(store.save_categories(vec!["x".into()]).is_err());
        assert_eq!(
            fs::read_to_string(&path).unwrap(),
            r#"{"categories": ["開発",#"#
        );
    }

    #[test]
    fn saves_normalized_categories_and_keeps_other_keys() {
        let path = temp_path("save");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, r#"{"categories": [], "note": "mine"}"#).unwrap();
        let store = ConfigStore::new(path.clone());
        let view = store
            .save_categories(vec![
                " 開発 ".into(),
                "".into(),
                "開発".into(),
                "調査".into(),
            ])
            .unwrap();
        assert_eq!(view.categories, vec!["開発", "調査"]);
        let written: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(
            written,
            serde_json::json!({ "categories": ["開発", "調査"], "note": "mine" })
        );
    }
}
