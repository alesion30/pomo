use std::path::PathBuf;

fn data_dir_for(xdg_data_home: Option<&str>, home: &str) -> PathBuf {
    match xdg_data_home.filter(|value| !value.is_empty()) {
        Some(path) => PathBuf::from(path).join("pomo"),
        None => PathBuf::from(home).join(".local/share/pomo"),
    }
}

pub fn data_dir() -> PathBuf {
    data_dir_for(
        std::env::var("XDG_DATA_HOME").ok().as_deref(),
        &std::env::var("HOME").unwrap_or_default(),
    )
}

#[cfg(test)]
mod tests {
    use super::data_dir_for;
    use std::path::PathBuf;

    #[test]
    fn uses_nonempty_xdg_data_home() {
        assert_eq!(
            data_dir_for(Some("/data"), "/home/user"),
            PathBuf::from("/data/pomo")
        );
    }

    #[test]
    fn falls_back_to_home_for_missing_or_empty_xdg_data_home() {
        assert_eq!(
            data_dir_for(None, "/home/user"),
            PathBuf::from("/home/user/.local/share/pomo")
        );
        assert_eq!(
            data_dir_for(Some(""), "/home/user"),
            PathBuf::from("/home/user/.local/share/pomo")
        );
    }
}
