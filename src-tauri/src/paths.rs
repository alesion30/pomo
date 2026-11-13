use std::path::PathBuf;

fn xdg_dir(xdg_home: Option<&str>, home: &str, fallback: &str) -> PathBuf {
    match xdg_home.filter(|value| !value.is_empty()) {
        Some(path) => PathBuf::from(path).join("pomo"),
        None => PathBuf::from(home).join(fallback).join("pomo"),
    }
}

fn from_env(var: &str, fallback: &str) -> PathBuf {
    xdg_dir(
        std::env::var(var).ok().as_deref(),
        &std::env::var("HOME").unwrap_or_default(),
        fallback,
    )
}

pub fn data_dir() -> PathBuf {
    from_env("XDG_DATA_HOME", ".local/share")
}

pub fn config_path() -> PathBuf {
    from_env("XDG_CONFIG_HOME", ".config").join("config.json")
}

#[cfg(test)]
mod tests {
    use super::xdg_dir;
    use std::path::PathBuf;

    #[test]
    fn uses_nonempty_xdg_data_home() {
        assert_eq!(
            xdg_dir(Some("/data"), "/home/user", ".local/share"),
            PathBuf::from("/data/pomo")
        );
    }

    #[test]
    fn falls_back_to_home_for_missing_or_empty_xdg_data_home() {
        assert_eq!(
            xdg_dir(None, "/home/user", ".local/share"),
            PathBuf::from("/home/user/.local/share/pomo")
        );
        assert_eq!(
            xdg_dir(Some(""), "/home/user", ".local/share"),
            PathBuf::from("/home/user/.local/share/pomo")
        );
    }

    #[test]
    fn config_dir_follows_xdg_config_home() {
        assert_eq!(
            xdg_dir(Some("/cfg"), "/home/user", ".config"),
            PathBuf::from("/cfg/pomo")
        );
        assert_eq!(
            xdg_dir(None, "/home/user", ".config"),
            PathBuf::from("/home/user/.config/pomo")
        );
    }
}
