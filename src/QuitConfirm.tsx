import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function QuitConfirm() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("quit-requested", () => setShown(true)).then((off) => {
      unlisten = off;
    });
    return () => unlisten?.();
  }, []);
  if (!shown) return null;
  return (
    <section data-testid="quit-confirm" role="dialog" aria-modal="true">
      <p>タイマーを終了しますか？</p>
      <button
        type="button"
        data-testid="quit-confirm-ok"
        onClick={() => void invoke("quit_app")}
      >
        終了
      </button>
      <button
        type="button"
        data-testid="quit-confirm-cancel"
        onClick={() => setShown(false)}
      >
        キャンセル
      </button>
    </section>
  );
}
