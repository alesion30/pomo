use tauri_plugin_notification::NotificationExt;

pub fn phase_due<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    kind: &crate::schedule::ScheduleKind,
) {
    let body = match kind {
        crate::schedule::ScheduleKind::Focus => "集中の予定時間になりました",
        crate::schedule::ScheduleKind::ShortBreak | crate::schedule::ScheduleKind::LongBreak => {
            "休憩の予定時間になりました"
        }
    };
    let _ = app
        .notification()
        .builder()
        .title("pomo")
        .body(body)
        .sound("NSUserNotificationDefaultSoundName")
        .show();
}
