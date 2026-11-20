import { useCallback, useEffect, useRef, useState } from "react";
import { seed } from "./seed.js";

const key = "studenthub.workspace.v1";
const endpoint = "/api/workspace";
function readDevice() {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : { state: null, revision: 0 };
}
async function readServer() {
  const response = await fetch(endpoint, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (response.status === 401) return { mode: "device", ...readDevice() };
  if (!response.ok)
    throw Error(
      "Your workspace could not be loaded. Check your connection and try again.",
    );
  return { mode: "server", ...(await response.json()) };
}
async function write(snapshot, state) {
  if (snapshot.mode === "device") {
    if (readDevice().revision !== snapshot.revision) return null;
    const next = { revision: snapshot.revision + 1, state };
    localStorage.setItem(key, JSON.stringify(next));
    return { ...next, mode: "device" };
  }
  const response = await fetch(endpoint, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: snapshot.revision, state }),
  });
  if (response.status === 409) return null;
  if (!response.ok)
    throw Error(
      "Your changes could not be saved. Check your connection and try again.",
    );
  const result = await response.json();
  return { mode: "server", revision: result.revision, state };
}
export function useWorkspace() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const latest = useRef(null),
    queue = useRef(Promise.resolve());
  const accept = useCallback((next) => {
    latest.current = next;
    setData(next);
  }, []);
  const refresh = useCallback(async () => {
    let next = await readServer();
    if (!next.state) {
      const initialized = await write(next, seed());
      next = initialized || (await readServer());
    }
    if (!next.state)
      throw Error("Your workspace could not be opened. Please try again.");
    accept(next);
    setError("");
  }, [accept]);
  const enqueue = useCallback((job) => {
    const pending = queue.current.then(job);
    queue.current = pending.catch(() => {});
    return pending;
  }, []);
  const reload = useCallback(
    () => enqueue(refresh).catch((e) => setError(e.message)),
    [refresh, enqueue],
  );
  useEffect(() => {
    reload();
    function onFocus() {
      if (document.visibilityState === "visible") reload();
    }
    function onStorage(e) {
      if (e.key === key) reload();
    }
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [reload]);
  const mutate = useCallback(
    (change) =>
      enqueue(async () => {
        let base = latest.current;
        if (!base) throw Error("Your workspace is still loading.");
        for (let attempt = 0; attempt < 4; attempt++) {
          const state = change(base.state);
          if (state === base.state) {
            accept(base);
            return;
          }
          const next = await write(base, state);
          if (next) {
            accept(next);
            setError("");
            return;
          }
          base = await readServer();
        }
        throw Error("Your workspace changed in another tab. Please try again.");
      }),
    [accept, enqueue],
  );
  return { state: data?.state, mode: data?.mode, error, reload, mutate };
}
export function editRow(bucket, id, change) {
  return (state) => {
    const row = state[bucket].find((r) => r.id === id);
    if (!row) throw Error("This item has already been removed.");
    const changed =
      typeof change === "function" ? change(row) : { ...row, ...change };
    return {
      ...state,
      [bucket]: state[bucket].map((r) => (r.id === id ? changed : r)),
    };
  };
}
export const newRow = (bucket, value) => (state) =>
  state[bucket].some((r) => r.id === value.id)
    ? state
    : { ...state, [bucket]: [...state[bucket], value] };
export const removeRow = (bucket, id) => (state) => ({
  ...state,
  [bucket]: state[bucket].filter((r) => r.id !== id),
});
