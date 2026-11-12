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
        center_on_key_screen(&window);
        let _ = window.show();
        let _ = window.set_focus();
    });
}

// 複数ディスプレイでは、マウスカーソルがある画面（作業中の画面）の中央に出す。
// tao の center() はウィンドウが今いる画面に寄せるので、全画面アプリと別の画面に出てしまう。
// NSScreen.mainScreen は pomo がキーウィンドウを持たない時に作業中の画面を返さないので使わない。
fn center_on_key_screen<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    #[cfg(target_os = "macos")]
    {
        use objc2::MainThreadMarker;
        use objc2_app_kit::{NSEvent, NSScreen};
        use objc2_foundation::NSPoint;
        let (Some(mtm), Ok(ptr)) = (MainThreadMarker::new(), window.ns_window()) else {
            let _ = window.center();
            return;
        };
        let mouse = NSEvent::mouseLocation();
        let screens = NSScreen::screens(mtm);
        let Some(screen) = screens.iter().find(|screen| {
            let f = screen.frame();
            mouse.x >= f.origin.x
                && mouse.x < f.origin.x + f.size.width
                && mouse.y >= f.origin.y
                && mouse.y < f.origin.y + f.size.height
        }) else {
            let _ = window.center();
            return;
        };
        let ns_window = unsafe { &*(ptr as *const NSWindow) };
        let area = screen.visibleFrame();
        let size = ns_window.frame().size;
        ns_window.setFrameOrigin(NSPoint::new(
            area.origin.x + (area.size.width - size.width) / 2.0,
            area.origin.y + (area.size.height - size.height) / 2.0,
        ));
    }
    #[cfg(not(target_os = "macos"))]
    let _ = window.center();
}

#[tauri::command]
pub fn hide_front<R: tauri::Runtime>(app: AppHandle<R>) {
    if let Some(window) = app.get_webview_window("front") {
        let popover = app.get_webview_window("popover");
        let handle = app.clone();
        let _ = app.run_on_main_thread(move || {
            let _ = window.hide();
            // 全画面アプリの上で閉じた時に、キー入力を元のアプリへ返す。ポップオーバーが出ている間は隠さない。
            let popover_visible = popover.and_then(|p| p.is_visible().ok()).unwrap_or(false);
            #[cfg(target_os = "macos")]
            if !popover_visible {
                let _ = handle.hide();
            }
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
