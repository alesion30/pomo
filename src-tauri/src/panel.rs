use objc2_app_kit::{
    NSApplication, NSApplicationActivationPolicy, NSWindow, NSWindowCollectionBehavior,
};
use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, Manager};

#[derive(Default)]
pub struct DuePresentation {
    pub restore: Option<Restore>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Restore {
    // 区切りではマウスのある画面へ動かす。倍率の違う画面へ移ると物理座標では元の位置に戻らないので、論理座標で持つ。
    pub position: LogicalPosition<f64>,
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
        && let (Ok(position), Ok(scale), Ok(visible)) = (
            window.outer_position(),
            window.scale_factor(),
            window.is_visible(),
        )
    {
        record(
            &mut state.lock().unwrap(),
            Restore {
                position: position.to_logical(scale),
                was_visible: visible,
            },
        );
    }
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        #[cfg(target_os = "macos")]
        if let (Some(mtm), Ok(ptr)) = (objc2::MainThreadMarker::new(), window.ns_window()) {
            let ns_window = unsafe { &*(ptr as *const NSWindow) };
            let ns_app = NSApplication::sharedApplication(mtm);
            // 別のスペースにあって見えていなかったウィンドウは、閉じていたのと同じに扱う。
            // 表示に戻すと、区切りを抜けた時に全画面アプリからそのスペースへ切り替わってしまう（実機で確かめた）。
            if !ns_window.isOnActiveSpace()
                && let Some(restore) = handle
                    .state::<Mutex<DuePresentation>>()
                    .lock()
                    .unwrap()
                    .restore
                    .as_mut()
            {
                restore.was_visible = false;
            }
            // Dock に出るアプリのウィンドウは、他のアプリの全画面スペースの上に出せない（実機で確かめた）。
            // 前に出している間だけ Dock に出ないアプリにする。Tauri 経由では前面化より後に反映され、
            // キーウィンドウにならないことが多かったので、AppKit を直接、前面化より先に呼ぶ。
            ns_app.setActivationPolicy(NSApplicationActivationPolicy::Accessory);
            ns_window.setCollectionBehavior(behavior_flags());
            ns_window.setLevel(25);
            if ns_window.isMiniaturized() {
                ns_window.deminiaturize(None);
            }
            center_on_key_screen(&window);
            ns_window.makeKeyAndOrderFront(None);
            #[allow(deprecated)]
            ns_app.activateIgnoringOtherApps(true);
            return;
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
    let _ = app.run_on_main_thread(move || {
        #[cfg(target_os = "macos")]
        if let Ok(ptr) = window.ns_window() {
            let ns_window = unsafe { &*(ptr as *const NSWindow) };
            // 全スペースの設定を外す前に隠す。前面のまま外すと、全画面アプリからウィンドウのあるスペースへ切り替わる（実機で確かめた）。
            // Tauri の hide は後から実行されるので、AppKit を直接呼ぶ。
            if !restore.was_visible
                && let Some(mtm) = objc2::MainThreadMarker::new()
            {
                ns_window.orderOut(None);
                NSApplication::sharedApplication(mtm).hide(None);
            }
            ns_window.setCollectionBehavior(NSWindowCollectionBehavior::Default);
            // tauri.conf.json の alwaysOnTop に戻す。tao は最前面に 5 を使い、is_always_on_top も 5 で判定する。
            ns_window.setLevel(5);
            if let Some(mtm) = objc2::MainThreadMarker::new() {
                NSApplication::sharedApplication(mtm)
                    .setActivationPolicy(NSApplicationActivationPolicy::Regular);
            }
        }
        let _ = window.set_position(tauri::Position::Logical(restore.position));
        #[cfg(not(target_os = "macos"))]
        if !restore.was_visible {
            let _ = window.hide();
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
            position: LogicalPosition::new(1.0, 2.0),
            was_visible: false,
        };
        let second = Restore {
            position: LogicalPosition::new(3.0, 4.0),
            was_visible: true,
        };
        let mut state = DuePresentation::default();
        record(&mut state, first);
        record(&mut state, second);
        assert_eq!(take_restore(&mut state), Some(first));
        assert_eq!(take_restore(&mut state), None);
    }
}
