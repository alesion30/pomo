use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
use tauri::{AppHandle, Manager};

pub fn behavior_flags() -> NSWindowCollectionBehavior {
    NSWindowCollectionBehavior::CanJoinAllSpaces | NSWindowCollectionBehavior::FullScreenAuxiliary
}

pub fn configure<R: tauri::Runtime>(app: &AppHandle<R>) {
    #[cfg(target_os = "macos")]
    if let Some(window) = app.get_webview_window("front")
        && let Ok(ptr) = window.ns_window()
    {
        let ns_window = unsafe { &*(ptr as *const NSWindow) };
        ns_window.setCollectionBehavior(behavior_flags());
        ns_window.setLevel(25);
    }
}

pub fn show_front<R: tauri::Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window("front") else {
        return;
    };
    let _ = app.run_on_main_thread(move || {
        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
    });
}

#[tauri::command]
pub fn hide_front<R: tauri::Runtime>(app: AppHandle<R>) {
    if let Some(window) = app.get_webview_window("front") {
        let _ = app.run_on_main_thread(move || {
            let _ = window.hide();
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn joins_all_spaces_and_fullscreen() {
        let flags = behavior_flags();
        assert!(flags.contains(NSWindowCollectionBehavior::CanJoinAllSpaces));
        assert!(flags.contains(NSWindowCollectionBehavior::FullScreenAuxiliary));
    }
}
