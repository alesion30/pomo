import { useCallback, useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import { durations } from "../domain/constants";
import { type AppState, type Command, view } from "../domain/timer";
import { CategorySelect } from "../ui/CategorySelect";
import { Clock } from "../ui/Clock";
import { CycleDots, cycleProgress } from "../ui/CycleDots";
import { type Colors, hueOf } from "../ui/categoryColor";
import { Dial } from "../ui/Dial";
import { TitleField } from "../ui/TitleField";
import { formatClock } from "./clockTime";
import { TimeEditDialog, TimeRange } from "./TimeRange";
import { WrapUpSheet } from "./WrapUpSheet";

export function Popover({
  appState,
  now,
  scale,
  dispatch,
  categories,
  colors = {},
  onOpenSettings,
  onOpenHistory,
}: {
  appState: AppState;
  now: number;
  scale: number;
  dispatch: (command: Command) => void;
  categories: string[];
  colors?: Colors;
  onOpenSettings(): void;
  onOpenHistory(): void;
}) {
  const [confirming, setConfirming] = useState<keyof typeof confirms | null>(
    null,
  );
  const [wrappingUp, setWrappingUp] = useState<"break" | "end" | null>(null);
  const [editingTimes, setEditingTimes] = useState(false);
  const closeTimes = useCallback(() => setEditingTimes(false), []);
  const timer = appState.timer;
  const time = view(timer, now);
  const accentHue = hueOf(appState.draft.category || null, categories, colors);
  const dialTime =
    timer.phase === "idle"
      ? { remainingSec: durations(scale).focus, overtimeSec: 0 }
      : time;
  const { done, current } = cycleProgress(appState, now, scale);
  const edit = (field: "title" | "category" | "notes", value: string) =>
    dispatch({ type: "editDraft", [field]: value });
  return (
    <main
      className="screen"
      data-testid="popover"
      data-tone={timer.phase}
      data-hue={accentHue}
    >
      {confirming && (
        <ConfirmDialog
          name={confirming}
          {...confirms[confirming]}
          onConfirm={() => {
            setConfirming(null);
            dispatch(confirms[confirming].command);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
      {wrappingUp && timer.phase === "focus" && (
        <WrapUpSheet
          name={wrappingUp}
          title={appState.draft.title}
          category={appState.draft.category}
          notes={appState.draft.notes}
          early={time.remainingSec > 0}
          onNotes={(value) => edit("notes", value)}
          onConfirm={() => {
            setWrappingUp(null);
            dispatch({
              type: wrappingUp === "break" ? "startBreak" : "endFocus",
            });
          }}
          onCancel={() => setWrappingUp(null)}
        />
      )}
      {editingTimes && timer.phase !== "idle" && (
        <TimeEditDialog
          timer={timer}
          now={now}
          scale={scale}
          onSave={(startedAt, plannedMin) => {
            setEditingTimes(false);
            dispatch({ type: "editTimes", startedAt, plannedMin });
          }}
          onCancel={closeTimes}
        />
      )}
      <div className="topbar">
        <CycleDots done={done} current={current} />
        <div className="pane-tools">
          <button
            type="button"
            className="icon-button"
            data-testid="open-history"
            aria-label="履歴"
            title="履歴"
            onClick={onOpenHistory}
          >
            <HistoryIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            data-testid="open-settings"
            aria-label="設定"
            title="設定（⌘,）"
            onClick={onOpenSettings}
          >
            <GearIcon />
          </button>
        </div>
      </div>
      <section className="intent">
        {timer.phase === "break" && <p className="intent-label">次の集中</p>}
        <TitleField
          testId="title-input"
          placeholder={
            timer.phase === "idle"
              ? "何に集中しますか？"
              : timer.phase === "break"
                ? "次は何に集中しますか？"
                : "タイトル"
          }
          value={appState.draft.title}
          onChange={(value) => edit("title", value)}
        />
        <CategorySelect
          testId="category-input"
          categories={categories}
          hue={accentHue}
          value={appState.draft.category}
          onChange={(value) => edit("category", value)}
        />
      </section>
      <section className="stage">
        <Dial
          form={timer.phase === "break" ? "ring" : "pie"}
          minutes={(dialTime.remainingSec * scale) / 60}
        />
        <Clock testId="clock" time={dialTime} />
        {timer.phase === "idle" ? (
          <span className="time-preview">
            {formatClock(now)} →{" "}
            {formatClock(now + durations(scale).focus * 1000)}
          </span>
        ) : (
          <div className="adjust">
            <button
              type="button"
              data-testid="minus5"
              onClick={() => dispatch({ type: "adjust", deltaSec: -300 })}
            >
              −5分
            </button>
            <TimeRange timer={timer} onEdit={() => setEditingTimes(true)} />
            <button
              type="button"
              data-testid="plus5"
              onClick={() => dispatch({ type: "adjust", deltaSec: 300 })}
            >
              +5分
            </button>
          </div>
        )}
      </section>
      <div className="actions">
        {timer.phase === "idle" && (
          <button
            type="button"
            data-testid="start"
            className="button primary"
            onClick={() => dispatch({ type: "startFocus" })}
          >
            開始
          </button>
        )}
        {timer.phase === "idle" && timer.offer && (
          <>
            <button
              type="button"
              data-testid="start-break"
              className="button"
              onClick={() => dispatch({ type: "startBreak" })}
            >
              休憩開始
            </button>
            <button
              type="button"
              data-testid="skip-break"
              className="button"
              onClick={() => dispatch({ type: "skipBreak" })}
            >
              スキップ
            </button>
          </>
        )}
        {timer.phase === "focus" && (
          <button
            type="button"
            data-testid="break-now"
            className="button wide"
            onClick={() => setWrappingUp("break")}
          >
            休憩
          </button>
        )}
        {timer.phase === "focus" && (
          <button
            type="button"
            data-testid="end"
            className="button wide"
            onClick={() => setWrappingUp("end")}
          >
            終了
          </button>
        )}
        {timer.phase === "break" && (
          <>
            <button
              type="button"
              data-testid="start-focus"
              className="button primary"
              onClick={() => dispatch({ type: "startFocus" })}
            >
              集中を開始
            </button>
            <button
              type="button"
              data-testid="discard-break"
              className="button ghost"
              onClick={() => setConfirming("discard-break")}
            >
              休憩を破棄
            </button>
          </>
        )}
        {timer.phase === "focus" && (
          <button
            type="button"
            data-testid="discard"
            className="button ghost"
            onClick={() => setConfirming("discard")}
          >
            破棄
          </button>
        )}
      </div>
    </main>
  );
}

const confirms = {
  discard: {
    message: "集中を破棄しますか？",
    detail: "この集中は記録に残りません。",
    okLabel: "破棄する",
    command: { type: "discardFocus" },
  },
  "discard-break": {
    message: "休憩を破棄しますか？",
    detail: "この休憩は記録に残りません。",
    okLabel: "破棄する",
    command: { type: "discardBreak" },
  },
} satisfies Record<
  string,
  {
    message: string;
    detail: string;
    okLabel: string;
    command: Command;
  }
>;

function HistoryIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
