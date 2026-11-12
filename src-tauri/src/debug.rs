use crate::debug_tray_click;
use std::{
    io::{BufRead, BufReader, Write},
    os::unix::net::UnixListener,
    path::PathBuf,
    thread,
};
use tauri::{AppHandle, Manager};

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
                        .find(|window| window.is_focused().unwrap_or(false))
                        .map(|window| window.label().to_owned())
                        .unwrap_or_else(|| "none".to_owned()),
                    _ => "error: unknown command".to_owned(),
                },
                Err(_) => "error: read failed".to_owned(),
            };
            let mut stream = reader.into_inner();
            let _ = writeln!(stream, "{response}");
        }
    });
}
