#[cfg(debug_assertions)]
mod debug;
mod paths;
mod schedule;
mod store;

use schedule::{DueTracker, Schedule};
use std::sync::Mutex;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, Position, Rect, Runtime};

struct TrayTitle(Mutex<String>);
struct ActiveSchedule(Mutex<Option<Schedule>>);

fn set_title<R: Runtime>(app: &tauri::AppHandle<R>, title: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some(&title));
    }
    if let Some(stored) = app.try_state::<TrayTitle>() {
        *stored.0.lock().unwrap() = title;
    }
}

fn set_schedule<R: Runtime>(app: &tauri::AppHandle<R>, schedule: Option<Schedule>) {
    if let Some(active) = app.try_state::<ActiveSchedule>() {
        *active.0.lock().unwrap() = schedule;
    }
}

fn toggle_popover<R: Runtime>(app: &tauri::AppHandle<R>, rect: Option<Rect>) {
    let Some(window) = app.get_webview_window("popover") else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        // トレイの rect は物理ピクセルなので、ウィンドウ幅も倍率込みの物理幅で引く。
        let width = window.outer_size().map(|s| s.width as i32).unwrap_or(320);
        let position = rect
            .map(|r| {
                let p: tauri::PhysicalPosition<i32> = r.position.to_physical(1.0);
                let size: tauri::PhysicalSize<u32> = r.size.to_physical(1.0);
                tauri::PhysicalPosition::new(
                    p.x + size.width as i32 - width,
                    p.y + size.height as i32,
                )
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

#[tauri::command]
fn time_scale() -> f64 {
    #[cfg(debug_assertions)]
    {
        std::env::var("POMO_TIME_SCALE")
            .ok()
            .and_then(|v| v.parse().ok())
            .filter(|v: &f64| v.is_finite() && *v > 0.0)
            .unwrap_or(1.0)
    }
    #[cfg(not(debug_assertions))]
    {
        1.0
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder =
        tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|_, _, _| {}));
    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    builder
        .manage(TrayTitle(Mutex::new("pomo".into())))
        .manage(ActiveSchedule(Mutex::new(None)))
        .manage(store::StateStore::new(paths::data_dir()))
        .invoke_handler(tauri::generate_handler![
            store::append_record,
            store::save_state,
            store::load_state,
            time_scale
        ])
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
            let schedule = app
                .state::<store::StateStore>()
                .latest
                .lock()
                .unwrap()
                .schedule
                .clone();
            *app.state::<ActiveSchedule>().0.lock().unwrap() = schedule.clone();
            if let Some(s) = &schedule {
                set_title(
                    app.handle(),
                    schedule::format_title(Some(s), chrono_millis()),
                );
            }
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut due = DueTracker::default();
                loop {
                    let schedule = handle.state::<ActiveSchedule>().0.lock().unwrap().clone();
                    let now = chrono_millis();
                    set_title(&handle, schedule::format_title(schedule.as_ref(), now));
                    if due.should_fire(schedule.as_ref(), now) {
                        let _ = handle.emit("phase-due", ());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(
                        1000 - (now.rem_euclid(1000) as u64),
                    ));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn chrono_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
