use crate::debug_tray_click;
use std::{
    io::{BufRead, BufReader, Write},
    os::unix::net::UnixListener,
    path::PathBuf,
    thread,
};
use tauri::{AppHandle, Manager};

#[cfg(target_os = "macos")]
fn key_quit(app: &AppHandle) -> String {
    use objc2::{MainThreadMarker, msg_send, sel};
    use objc2_app_kit::{NSApplication, NSEvent, NSEventModifierFlags, NSEventType};
    use objc2_foundation::{NSPoint, NSString};
    let (tx, rx) = std::sync::mpsc::channel();
    let _ = app.run_on_main_thread(move || {
        let mtm = MainThreadMarker::new().unwrap();
        let app = NSApplication::sharedApplication(mtm);
        let q = NSString::from_str("q");
        let event = NSEvent::keyEventWithType_location_modifierFlags_timestamp_windowNumber_context_characters_charactersIgnoringModifiers_isARepeat_keyCode(NSEventType::KeyDown, NSPoint::new(0.0, 0.0), NSEventModifierFlags::Command, 0.0, 0, None, &q, &q, false, 12);
        let response = match (app.mainMenu(), event) {
            (Some(menu), Some(event)) => {
                unsafe { let _: () = msg_send![&*menu, performSelector: sel!(performKeyEquivalent:), withObject: &*event, afterDelay: 0.0f64]; }
                "scheduled performKeyEquivalent".to_owned()
            }
            _ => "no menu or event".to_owned(),
        };
        let _ = tx.send(response);
    });
    rx.recv().unwrap_or_default()
}

fn close_main(app: &AppHandle) -> String {
    let Some(window) = app.get_webview_window("main") else {
        return "error: no main window".to_owned();
    };
    let (tx, rx) = std::sync::mpsc::channel();
    if app
        .run_on_main_thread(move || {
            if let Ok(ptr) = window.ns_window() {
                let ns = unsafe { &*(ptr as *const objc2_app_kit::NSWindow) };
                ns.performClose(None);
            }
            let _ = tx.send(());
        })
        .is_err()
    {
        return "error: could not schedule close".to_owned();
    }
    if rx.recv().is_ok() {
        "ok".to_owned()
    } else {
        "error: close failed".to_owned()
    }
}

pub fn start(app: AppHandle, socket: PathBuf) {
    let _ = std::fs::remove_file(&socket);
    thread::spawn(move || {
        let listener = match UnixListener::bind(&socket) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("debug socket {}: {error}", socket.display());
                return;
            }
        };
        for stream in listener.incoming().flatten() {
            let mut reader = BufReader::new(stream);
            let mut command = String::new();
            let response = match reader.read_line(&mut command) {
                Ok(_) => match command.trim() {
                    "tray-click" => {
                        debug_tray_click(&app);
                        "ok".to_owned()
                    }
                    "title" => app.state::<crate::TrayTitle>().0.lock().unwrap().clone(),
                    "key-window" => app
                        .webview_windows()
                        .values()
                        .find(|w| w.is_focused().unwrap_or(false))
                        .map(|w| w.label().to_owned())
                        .unwrap_or_else(|| "none".to_owned()),
                    "key-quit" => key_quit(&app),
                    "close" => close_main(&app),
                    _ => "error: unknown command".to_owned(),
                },
                Err(_) => "error: read failed".to_owned(),
            };
            let mut stream = reader.into_inner();
            let _ = writeln!(stream, "{response}");
        }
    });
}
