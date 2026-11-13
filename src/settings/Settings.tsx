import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { UpdateButton } from "../popover/UpdateButton";
import type { ConfigView } from "../useConfig";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "latest" }
  | { state: "found"; version: string }
  | { state: "failed"; message: string };

export function Settings({
  config,
  phase,
  saveCategories,
  onClose,
}: {
  config: ConfigView | null;
  phase: "idle" | "focus" | "break";
  saveCategories(categories: string[]): Promise<void>;
  onClose(): void;
}) {
  const [version, setVersion] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [applying, setApplying] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  useEffect(() => {
    void getVersion().then(setVersion).catch(console.error);
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  const categories = config?.categories ?? [];
  const save = (next: string[]) => {
    setSaveError(null);
    saveCategories(next).catch((error: unknown) => setSaveError(String(error)));
  };
  const move = (index: number, delta: -1 | 1) => {
    const next = [...categories];
    const [item] = next.splice(index, 1);
    if (item === undefined) return;
    next.splice(index + delta, 0, item);
    save(next);
  };
  const rename = (index: number, name: string) => {
    if (name.trim() === categories[index]) return;
    save(categories.map((c, i) => (i === index ? name : c)));
  };
  const add = () => {
    if (!newCategory.trim()) return;
    save([...categories, newCategory]);
    setNewCategory("");
  };
  const runCheck = () => {
    setCheck({ state: "checking" });
    invoke<string | null>("check_update")
      .then((found) =>
        setCheck(
          found ? { state: "found", version: found } : { state: "latest" },
        ),
      )
      .catch((error: unknown) =>
        setCheck({ state: "failed", message: String(error) }),
      );
  };
  const apply = () => {
    setApplying(true);
    invoke<void>("apply_update").catch((error: unknown) => {
      setApplying(false);
      setCheck({ state: "failed", message: String(error) });
    });
  };
  const error = saveError ?? config?.error ?? null;
  return (
    <main className="screen" data-testid="settings" data-tone="idle">
      <div className="pane-time settings-side">
        <div className="pane-head">
          <h1 className="phase">設定</h1>
          <button
            type="button"
            className="icon-button"
            data-testid="settings-close"
            aria-label="設定を閉じる"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="settings-about">
          <p className="settings-version" data-testid="app-version">
            pomo {version && `v${version}`}
          </p>
          <button
            type="button"
            className="button"
            data-testid="check-update"
            disabled={check.state === "checking"}
            onClick={runCheck}
          >
            {check.state === "checking" ? "確認中…" : "アップデートを確認"}
          </button>
          {check.state === "latest" && (
            <small data-testid="update-latest">最新の版です</small>
          )}
          {check.state === "found" && (
            <UpdateButton
              version={check.version}
              phase={phase}
              applying={applying}
              onApply={apply}
            />
          )}
          {check.state === "failed" && (
            <p role="alert" className="alert">
              {check.message}
            </p>
          )}
        </div>
        <button
          type="button"
          className="button ghost"
          data-testid="reveal-config"
          onClick={() => void invoke("reveal_config").catch(console.error)}
        >
          設定ファイルを Finder で表示
        </button>
      </div>
      <div className="pane-note">
        <div className="card">
          <p className="card-label">カテゴリ</p>
          {error && (
            <p role="alert" className="alert" data-testid="config-error">
              {error}
            </p>
          )}
          <ul className="category-list" data-testid="category-list">
            {categories.map((category, index) => (
              <li key={category} className="category-item">
                <input
                  className="category-name"
                  data-testid="category-name"
                  aria-label="カテゴリ名"
                  defaultValue={category}
                  onBlur={(e) => rename(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${category} を上へ`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${category} を下へ`}
                  disabled={index === categories.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  data-testid="category-delete"
                  aria-label={`${category} を削除`}
                  onClick={() => save(categories.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="category-add"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input
              className="category-name"
              data-testid="category-new"
              aria-label="新しいカテゴリ"
              placeholder="新しいカテゴリ"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button
              type="submit"
              className="button"
              data-testid="category-add"
              disabled={!newCategory.trim()}
            >
              追加
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
