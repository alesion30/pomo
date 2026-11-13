import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

export type ConfigView = { categories: string[]; error: string | null };

export function useConfig() {
  // 読み込むまでは null にして、空の一覧と区別する。空の一覧で入力欄のカテゴリを消さないため。
  const [config, setConfig] = useState<ConfigView | null>(null);
  const request = useRef(0);
  const reload = useCallback(() => {
    const id = ++request.current;
    void invoke<ConfigView>("load_config")
      .then((view) => {
        if (id === request.current) setConfig(view);
      })
      .catch(console.error);
  }, []);
  const saveCategories = useCallback(async (categories: string[]) => {
    request.current++;
    setConfig(await invoke<ConfigView>("save_categories", { categories }));
  }, []);
  useEffect(() => {
    reload();
    // config.json は手でも編集するので、ウィンドウが前面に来るたびに読み直す。
    const refresh = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);
  return { config, reload, saveCategories };
}
