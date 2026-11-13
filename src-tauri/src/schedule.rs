use serde::{Deserialize, Serialize};
use unicode_width::UnicodeWidthChar;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleKind {
    Focus,
    ShortBreak,
    LongBreak,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Schedule {
    pub label: String,
    pub kind: ScheduleKind,
    pub started_at: i64,
    pub planned_end: i64,
}

pub fn truncate_label(label: &str, max_width: usize) -> String {
    let width: usize = label
        .chars()
        .map(UnicodeWidthChar::width)
        .map(Option::unwrap_or_default)
        .sum();
    if width <= max_width {
        return label.to_owned();
    }
    let mut result = String::new();
    let mut used = 0;
    for ch in label.chars() {
        let w = ch.width().unwrap_or(0);
        if used + w > max_width {
            break;
        }
        result.push(ch);
        used += w;
    }
    result.push('…');
    result
}

pub fn format_title(schedule: Option<&Schedule>, now: i64) -> String {
    let Some(s) = schedule else {
        return "pomo".into();
    };
    // 残りは切り上げ、超過は切り捨てにして、ポップオーバーの表示とそろえる。
    let seconds = if now >= s.planned_end {
        (now - s.planned_end) / 1000
    } else {
        (s.planned_end - now + 999) / 1000
    };
    let time = format!("{:02}:{:02}", seconds / 60, seconds % 60);
    match s.kind {
        ScheduleKind::Focus => {
            let time = if now >= s.planned_end {
                format!("+{time}")
            } else {
                time
            };
            let label = truncate_label(&s.label, 24);
            if label.is_empty() {
                time
            } else {
                format!("{label} - {time}")
            }
        }
        _ => format!("☕ {}{time}", if now >= s.planned_end { "+" } else { "" }),
    }
}

#[derive(Default)]
pub struct DueTracker {
    current: Option<i64>,
    planned_end: Option<i64>,
    fired: bool,
}
impl DueTracker {
    pub fn should_fire(&mut self, schedule: Option<&Schedule>, now: i64) -> bool {
        let Some(s) = schedule else {
            self.current = None;
            self.planned_end = None;
            self.fired = false;
            return false;
        };
        // 同じフェーズの中では、予定時刻が未来に戻った時だけ再び出せるようにする。
        if self.current != Some(s.started_at) {
            self.current = Some(s.started_at);
            self.planned_end = None;
            self.fired = false;
        }
        // ±5 分で予定時刻を動かして超過に入った時は、自分で切り上げたので前面化しない。
        let moved = self.planned_end.is_some_and(|end| end != s.planned_end);
        self.planned_end = Some(s.planned_end);
        if now < s.planned_end {
            self.fired = false;
            return false;
        }
        if self.fired {
            return false;
        }
        self.fired = true;
        !moved
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample(kind: ScheduleKind) -> Schedule {
        Schedule {
            label: "作業".into(),
            kind,
            started_at: 0,
            planned_end: 60_000,
        }
    }
    #[test]
    fn truncates_by_display_width() {
        assert_eq!(
            truncate_label("あいうえおかきくけこさし", 24),
            "あいうえおかきくけこさし"
        );
        assert_eq!(
            truncate_label("あいうえおかきくけこさしす", 24),
            "あいうえおかきくけこさし…"
        );
    }
    #[test]
    fn formats_overtime() {
        assert_eq!(
            format_title(Some(&sample(ScheduleKind::Focus)), 244_000),
            "作業 - +03:04"
        );
    }
    #[test]
    fn remaining_rounds_up_like_the_popover() {
        let s = sample(ScheduleKind::Focus);
        assert_eq!(format_title(Some(&s), 0), "作業 - 01:00");
        assert_eq!(format_title(Some(&s), 500), "作業 - 01:00");
        assert_eq!(format_title(Some(&s), 1_000), "作業 - 00:59");
        assert_eq!(format_title(Some(&s), 60_000), "作業 - +00:00");
    }
    #[test]
    fn shows_time_only_without_title_and_keeps_break_format() {
        let mut s = sample(ScheduleKind::Focus);
        s.label.clear();
        assert_eq!(format_title(Some(&s), 0), "01:00");
        assert_eq!(
            format_title(Some(&sample(ScheduleKind::ShortBreak)), 0),
            "☕ 01:00"
        );
    }
    #[test]
    fn adjusting_into_overtime_does_not_fire() {
        let s = sample(ScheduleKind::Focus);
        let mut d = DueTracker::default();
        assert!(!d.should_fire(Some(&s), 30_000));
        let mut cut = s.clone();
        cut.planned_end = 30_000;
        assert!(!d.should_fire(Some(&cut), 30_000));
        assert!(!d.should_fire(Some(&cut), 31_000));
        // 延ばして予定時刻が未来に戻れば、時間が進んで迎えた時にまた出す。
        let mut extended = cut.clone();
        extended.planned_end = 40_000;
        assert!(!d.should_fire(Some(&extended), 32_000));
        assert!(d.should_fire(Some(&extended), 40_000));
    }
    #[test]
    fn fires_when_launched_already_overdue() {
        let mut d = DueTracker::default();
        assert!(d.should_fire(Some(&sample(ScheduleKind::Focus)), 90_000));
    }
    #[test]
    fn due_fires_once_and_rearms() {
        let s = sample(ScheduleKind::Focus);
        let mut d = DueTracker::default();
        assert!(d.should_fire(Some(&s), 60_000));
        assert!(!d.should_fire(Some(&s), 61_000));
        let mut earlier = s.clone();
        earlier.planned_end = 50_000;
        assert!(!d.should_fire(Some(&earlier), 62_000));
        let mut later = s.clone();
        later.planned_end = 70_000;
        assert!(!d.should_fire(Some(&later), 65_000));
        assert!(d.should_fire(Some(&later), 70_000));
    }
}
