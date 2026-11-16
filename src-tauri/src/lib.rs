mod config;
#[cfg(debug_assertions)]
mod debug;
mod notify;
mod panel;
mod paths;
mod schedule;
mod store;
mod update;

use schedule::{DueTracker, Schedule};
use std::sync::Mutex;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, Runtime};

fn install_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
    let quit = MenuItem::with_id(app, "quit", "pomo を終了", true, Some("CmdOrCtrl+Q"))?;
    let settings = MenuItem::with_id(app, "settings", "設定…", true, Some("CmdOrCtrl+,"))?;
    let app_menu = Submenu::with_items(
        app,
        "pomo",
        true,
        &[
            &PredefinedMenuItem::about(app, None, None)?,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    let window = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;
    let menu = Menu::with_items(app, &[&app_menu, &edit, &window])?;
    menu.set_as_app_menu()?;
    Ok(())
}

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
    set_title(
        app,
        schedule::format_title(schedule.as_ref(), chrono_millis()),
    );
    if let Some(active) = app.try_state::<ActiveSchedule>() {
        *active.0.lock().unwrap() = schedule;
    }
}

pub fn show_main<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(debug_assertions)]
pub(crate) fn debug_tray_click(app: &tauri::AppHandle) {
    show_main(app);
}

#[tauri::command]
fn quit_app<R: Runtime>(app: tauri::AppHandle<R>) {
    quit(&app);
}

fn quit<R: Runtime>(app: &tauri::AppHandle<R>) {
    // window-state は終了時の位置を保存する。区切りで中央に寄せたままだとその位置が残るので、先に元へ戻す。
    panel::end_due(app.clone());
    app.exit(0);
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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            show_main(app)
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build());
    #[cfg(not(debug_assertions))]
    let builder = builder.plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        Some(vec!["--autostart"]),
    ));
    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    builder
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(tauri_plugin_window_state::StateFlags::POSITION)
                .build(),
        )
        .on_menu_event(|app, event| {
            if event.id() == "settings" {
                show_main(app);
                let _ = app.emit("open-settings", ());
            }
            if event.id() == "quit" {
                if app.state::<ActiveSchedule>().0.lock().unwrap().is_some() {
                    show_main(app);
                    let _ = app.emit("quit-requested", ());
                } else {
                    quit(app);
                }
            }
        })
        .on_window_event(|window, event| {
            if window.label() == "main"
                && let tauri::WindowEvent::CloseRequested { api, .. } = event
            {
                api.prevent_close();
                // 区切りの画面のまま閉じても、最前面と全スペースの設定を残さない。
                panel::end_due(window.app_handle().clone());
                let _ = window.hide();
            }
        })
        .manage(TrayTitle(Mutex::new("pomo".into())))
        .manage(ActiveSchedule(Mutex::new(None)))
        .manage(Mutex::new(panel::DuePresentation::default()))
        .manage(store::StateStore::new(paths::data_dir()))
        .manage(update::AvailableUpdate(Mutex::new(None)))
        .manage(config::ConfigStore::new(paths::config_path()))
        .invoke_handler(tauri::generate_handler![
            store::append_record,
            store::save_state,
            store::load_state,
            config::load_config,
            config::save_categories,
            config::reveal_config,
            time_scale,
            panel::end_due,
            quit_app,
            update::update_status,
            update::apply_update,
            update::check_update
        ])
        .setup(|app| {
            install_menu(app.handle())?;
            #[cfg(not(debug_assertions))]
            {
                use tauri_plugin_autostart::ManagerExt;
                // 毎回いまの実行ファイルで登録し直す。初回を dmg の中から起動しても、
                // /Applications から起動した時に正しい場所へ書き換わる。
                // 登録に失敗してもタイマーは使えるので、起動は止めずに記録だけ残す。
                if let Err(error) = app.autolaunch().enable() {
                    eprintln!("autostart registration failed: {error}");
                }
            }
            update::start_checks(app.handle().clone());
            // 初回はここで空の config.json を作る。手で編集するファイルの場所を、起動しただけで見つけられるようにする。
            app.state::<config::ConfigStore>().load();
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
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
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
            if !std::env::args().any(|arg| arg == "--autostart") {
                show_main(app.handle());
            }
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut due = DueTracker::default();
                loop {
                    let schedule = handle.state::<ActiveSchedule>().0.lock().unwrap().clone();
                    let now = chrono_millis();
                    set_title(&handle, schedule::format_title(schedule.as_ref(), now));
                    if due.should_fire(schedule.as_ref(), now) {
                        if let Some(s) = schedule.as_ref() {
                            panel::present_due(&handle);
                            notify::phase_due(&handle, &s.kind);
                        }
                        let _ = handle.emit("phase-due", ());
                    }
                    // 予定時刻と同じ秒の位相の少し後に起きる。位相がずれると、表示の秒が飛んだり重なったりする。
                    let phase = schedule
                        .as_ref()
                        .map_or(0, |s| s.planned_end.rem_euclid(1000));
                    let wait = match (phase + 5 - now).rem_euclid(1000) {
                        0 => 1000,
                        ms => ms,
                    };
                    std::thread::sleep(std::time::Duration::from_millis(wait as u64));
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Reopen { .. }) {
                show_main(app);
            }
        });
}

fn chrono_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
