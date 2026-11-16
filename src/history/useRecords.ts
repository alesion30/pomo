import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import type { SessionRecord } from "../domain/record";

/** sessions.jsonl の全記録。タイマーの追記も含め、記録が変わるたびに読み直す。 */
export function useRecords() {
  const [records, setRecords] = useState<SessionRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    invoke<SessionRecord[]>("list_records")
      .then((list) => {
        setRecords(list);
        setError(null);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);
  useEffect(() => {
    reload();
    const unlisten = listen("records-changed", reload);
    return () => void unlisten.then((off) => off());
  }, [reload]);
  const put = useCallback(
    (record: SessionRecord) => invoke<void>("put_record", { record }),
    [],
  );
  const remove = useCallback(
    (id: string) => invoke<void>("delete_record", { id }),
    [],
  );
  return { records, error, put, remove };
}
