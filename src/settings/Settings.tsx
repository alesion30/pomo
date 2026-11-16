import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { type Colors, hueOf, PALETTE } from "../ui/categoryColor";
import type { ConfigView } from "../useConfig";
import { UpdateButton } from "./UpdateButton";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "latest" }
  | { state: "failed"; message: string };

export function Settings({
  config,
  phase,
  saveCategories,
  onClose,
}: {
  config: ConfigView | null;
  phase: "idle" | "focus" | "break";
  saveCategories(categories: string[], colors: Colors): Promise<void>;
  onClose(): void;
}) {
  const [version, setVersion] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  // 起動時と定期の確認で見つかった更新も、手動の確認で見つかった更新もここに入れる。
  const [available, setAvailable] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  useEffect(() => {
    void getVersion().then(setVersion).catch(console.error);
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.isComposing) onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  useEffect(() => {
    // 応答より先に update-available が届くことがあるので、null では消さない。
    const readStatus = () =>
      void invoke<string | null>("update_status")
        .then((version) => {
          if (version) setAvailable(version);
        })
        .catch(console.error);
    // 隠れている間は JS が止まり、定期の確認のイベントを受け取れないことがあるので、表に出たときに読み直す。
    const refresh = () => {
      if (document.visibilityState === "visible") readStatus();
    };
    readStatus();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const unlisten = listen<string>("update-available", (event) =>
      setAvailable(event.payload),
    );
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void unlisten.then((off) => off());
    };
  }, []);
  const categories = config?.categories ?? [];
  const colors = config?.colors ?? {};
  const save = (next: string[], nextColors: Colors = colors) => {
    setSaveError(null);
    saveCategories(next, nextColors).catch((error: unknown) =>
      setSaveError(String(error)),
    );
  };
  const choose = (category: string, color: string | null) => {
    const { [category]: _, ...rest } = colors;
    save(categories, color ? { ...rest, [category]: color } : rest);
    setPicking(null);
  };
  const move = (index: number, delta: -1 | 1) => {
    const next = [...categories];
    const [item] = next.splice(index, 1);
    if (item === undefined) return;
    next.splice(index + delta, 0, item);
    save(next);
  };
  const rename = (index: number, name: string) => {
    const old = categories[index];
    if (old === undefined || name.trim() === old) return;
    // 選んだ色は新しい名前に付け替える。
    const { [old]: color, ...rest } = colors;
    save(
      categories.map((c, i) => (i === index ? name : c)),
      color ? { ...rest, [name.trim()]: color } : rest,
    );
  };
  const add = () => {
    if (!newCategory.trim()) return;
    save([...categories, newCategory]);
    setNewCategory("");
  };
  const runCheck = () => {
    setApplyError(null);
    setCheck({ state: "checking" });
    invoke<string | null>("check_update")
      .then((found) => {
        if (found) setAvailable(found);
        setCheck(found ? { state: "idle" } : { state: "latest" });
      })
      .catch((error: unknown) =>
        setCheck({ state: "failed", message: String(error) }),
      );
  };
  const apply = () => {
    setApplyError(null);
    setApplying(true);
    invoke<void>("apply_update").catch((error: unknown) => {
      setApplying(false);
      setApplyError(String(error));
    });
  };
  const error = saveError ?? config?.error ?? null;
  return (
    <main className="screen settings" data-testid="settings" data-tone="idle">
      <header className="settings-head">
        <h1 className="screen-title">設定</h1>
        <button
          type="button"
          className="icon-button"
          data-testid="settings-close"
          aria-label="設定を閉じる"
          onClick={onClose}
        >
          <Icon>
            <path d="M18 6 6 18M6 6l12 12" />
          </Icon>
        </button>
      </header>
      <section
        className="settings-categories"
        aria-labelledby="categories-title"
      >
        <h2 className="settings-label" id="categories-title">
          カテゴリ
        </h2>
        {error && (
          <p role="alert" className="alert box" data-testid="config-error">
            {error}
          </p>
        )}
        <ul className="category-list" data-testid="category-list">
          {categories.map((category, index) => (
            <li key={category} className="category-item">
              <button
                type="button"
                className="category-swatch"
                data-testid="category-color"
                data-hue={hueOf(category, categories, colors)}
                aria-label={`${category} の色`}
                aria-expanded={picking === category}
                onClick={() =>
                  setPicking(picking === category ? null : category)
                }
              />
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
                <Icon>
                  <path d="m6 14 6-6 6 6" />
                </Icon>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`${category} を下へ`}
                disabled={index === categories.length - 1}
                onClick={() => move(index, 1)}
              >
                <Icon>
                  <path d="m6 10 6 6 6-6" />
                </Icon>
              </button>
              <button
                type="button"
                className="icon-button"
                data-testid="category-delete"
                aria-label={`${category} を削除`}
                onClick={() => save(categories.filter((_, i) => i !== index))}
              >
                <Icon>
                  <path d="M18 6 6 18M6 6l12 12" />
                </Icon>
              </button>
              {picking === category && (
                <fieldset
                  className="color-picker"
                  aria-label={`${category} の色`}
                >
                  {PALETTE.map((color, hue) => (
                    <button
                      key={color.name}
                      type="button"
                      className="category-swatch"
                      data-testid="category-color-option"
                      data-hue={hue}
                      aria-label={color.label}
                      aria-pressed={colors[category] === color.name}
                      onClick={() => choose(category, color.name)}
                    />
                  ))}
                  <button
                    type="button"
                    className="color-auto"
                    data-testid="category-color-auto"
                    aria-pressed={colors[category] === undefined}
                    onClick={() => choose(category, null)}
                  >
                    自動
                  </button>
                </fieldset>
              )}
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
      </section>
      <footer className="settings-about">
        <div className="settings-about-row">
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
        </div>
        {check.state === "latest" && available === null && (
          <small data-testid="update-latest">最新の版です</small>
        )}
        <UpdateButton
          version={available}
          phase={phase}
          applying={applying}
          onApply={apply}
        />
        {check.state === "failed" && (
          <p role="alert" className="alert">
            {check.message}
          </p>
        )}
        {applyError && (
          <p role="alert" className="alert" data-testid="update-error">
            更新に失敗しました: {applyError}
          </p>
        )}
        <button
          type="button"
          className="text-button"
          data-testid="reveal-config"
          onClick={() => void invoke("reveal_config").catch(console.error)}
        >
          設定ファイルを Finder で表示
        </button>
      </footer>
    </main>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
