#[cfg(debug_assertions)]
mod debug;
mod paths;

use std::sync::Mutex;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, Position, Rect, Runtime};

// リリース版でこの値を読むのはデバッグ用の制御ソケットだけなので、読まれない警告を許す。
#[cfg_attr(not(debug_assertions), expect(dead_code))]
struct TrayTitle(Mutex<String>);

fn toggle_popover<R: Runtime>(app: &tauri::AppHandle<R>, rect: Option<Rect>) {
    let Some(window) = app.get_webview_window("popover") else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let position = rect
            .map(|r| {
                let position: tauri::PhysicalPosition<i32> = r.position.to_physical(1.0);
                let size: tauri::PhysicalSize<u32> = r.size.to_physical(1.0);
                let x = position.x + size.width as i32 - 320;
                let y = position.y + size.height as i32;
                tauri::PhysicalPosition::new(x, y)
            })
            .unwrap_or_else(|| tauri::PhysicalPosition::new(1000, 24));
        let _ = window.set_position(Position::Physical(position));
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(debug_assertions)]
pub(crate) fn debug_tray_click(app: &tauri::AppHandle) {
    let rect = app
        .tray_by_id("main")
        .and_then(|tray| tray.rect().ok().flatten());
    toggle_popover(app, rect);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder =
        tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|_, _, _| {}));
    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    builder
        .manage(TrayTitle(Mutex::new("pomo".into())))
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.handle()
                .set_activation_policy(tauri::ActivationPolicy::Accessory)?;
            let data_dir = paths::data_dir();
            std::fs::create_dir_all(&data_dir)?;
            #[cfg(debug_assertions)]
            debug::start(app.handle().clone(), data_dir.join("debug.sock"));
            let _tray = TrayIconBuilder::with_id("main")
                .title("pomo")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        toggle_popover(tray.app_handle(), Some(rect));
                    }
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
