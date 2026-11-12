use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, PhysicalPosition};

#[derive(Default)]
pub struct DuePresentation {
    pub restore: Option<Restore>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Restore {
    pub position: PhysicalPosition<i32>,
    pub was_visible: bool,
}

pub fn record(state: &mut DuePresentation, restore: Restore) {
    state.restore.get_or_insert(restore);
}

pub fn take_restore(state: &mut DuePresentation) -> Option<Restore> {
    state.restore.take()
}

pub fn behavior_flags() -> NSWindowCollectionBehavior {
    NSWindowCollectionBehavior::CanJoinAllSpaces | NSWindowCollectionBehavior::FullScreenAuxiliary
}

pub fn present_due<R: tauri::Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let state = app.state::<Mutex<DuePresentation>>();
    if state.lock().unwrap().restore.is_none()
        && let (Ok(position), Ok(visible)) = (window.outer_position(), window.is_visible())
    {
        record(
            &mut state.lock().unwrap(),
            Restore {
                position,
                was_visible: visible,
            },
        );
    }
    let _ = app.run_on_main_thread(move || {
        #[cfg(target_os = "macos")]
        if let Ok(ptr) = window.ns_window() {
            let ns_window = unsafe { &*(ptr as *const NSWindow) };
            ns_window.setCollectionBehavior(behavior_flags());
            ns_window.setLevel(25);
        }
        let _ = window.unminimize();
        center_on_key_screen(&window);
        let _ = window.show();
        let _ = window.set_focus();
    });
}

#[tauri::command]
pub fn end_due<R: tauri::Runtime>(app: AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let restore = take_restore(&mut app.state::<Mutex<DuePresentation>>().lock().unwrap());
    let Some(restore) = restore else { return };
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        #[cfg(target_os = "macos")]
        if let Ok(ptr) = window.ns_window() {
            let ns_window = unsafe { &*(ptr as *const NSWindow) };
            ns_window.setCollectionBehavior(NSWindowCollectionBehavior::Default);
            ns_window.setLevel(0);
        }
        let _ = window.set_position(tauri::Position::Physical(restore.position));
        if !restore.was_visible {
            let _ = window.hide();
            let _ = handle.hide();
        }
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn due_restore_is_first_write_and_take_once() {
        let first = Restore {
            position: PhysicalPosition::new(1, 2),
            was_visible: false,
        };
        let second = Restore {
            position: PhysicalPosition::new(3, 4),
            was_visible: true,
        };
        let mut state = DuePresentation::default();
        record(&mut state, first);
        record(&mut state, second);
        assert_eq!(take_restore(&mut state), Some(first));
        assert_eq!(take_restore(&mut state), None);
    }
}
