import { LONG_EVERY } from "../domain/constants";
import { type AppState, streakExpired } from "../domain/timer";

const DOT_KEYS = ["first", "second", "third", "fourth"] as const;

export function cycleProgress(state: AppState, now: number, scale: number) {
  const count = Math.min(state.streak.completed, LONG_EVERY);
  const reset =
    state.timer.phase === "idle" && streakExpired(state.streak, now, scale);
  return {
    done: reset ? 0 : count,
    current:
      !reset && state.timer.phase === "focus" && count < LONG_EVERY
        ? count
        : -1,
  };
}

export function CycleDots({
  done,
  current = -1,
}: {
  done: number;
  current?: number;
}) {
  return (
    <div
      className="cycle"
      role="img"
      aria-label={`長い休憩まで 4 回のうち ${done} 回`}
    >
      {DOT_KEYS.slice(0, LONG_EVERY).map((dot, index) => (
        <i
          key={dot}
          data-state={
            index < done ? "done" : index === current ? "now" : "pending"
          }
        />
      ))}
    </div>
  );
}
