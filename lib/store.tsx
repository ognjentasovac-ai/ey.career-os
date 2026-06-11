"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AppState } from "./types";
import { initialState } from "./initial-data";

const STORAGE_KEY = "career-os:v1";
const KEY_STORAGE = "career-os:accesskey";

export type SyncStatus = "local" | "syncing" | "synced" | "error" | "auth";

interface StoreContextValue {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  patch: (partial: Partial<AppState>) => void;
  reset: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  hydrated: boolean;
  syncStatus: SyncStatus;
  authenticate: (key: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function mergeWithDefaults(parsed: Partial<AppState>): AppState {
  return { ...deepClone(initialState), ...parsed } as AppState;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setInternal] = useState<AppState>(() => deepClone(initialState));
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");

  const remoteEnabled = useRef(false);
  const accessKey = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");
  const skipFirstSave = useRef(true);

  function authHeaders(): Record<string, string> {
    return accessKey.current
      ? { "x-access-key": accessKey.current, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }

  // Try to pull the canonical state from the server.
  const loadRemote = useCallback(async () => {
    try {
      const res = await fetch("/api/state", {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (res.status === 401) {
        remoteEnabled.current = false;
        setSyncStatus("auth");
        return;
      }
      if (!res.ok) {
        remoteEnabled.current = false;
        setSyncStatus("local");
        return;
      }
      const json = (await res.json()) as {
        data: Partial<AppState> | null;
        remote?: boolean;
      };
      // If the server has no cloud database wired up, stay in local-only mode
      // (no errors, just per-device localStorage).
      if (json.remote === false) {
        remoteEnabled.current = false;
        setSyncStatus("local");
        return;
      }
      remoteEnabled.current = true;
      if (json.data && json.data.positions) {
        const merged = mergeWithDefaults(json.data);
        lastSaved.current = JSON.stringify(merged);
        setInternal(merged);
        setSyncStatus("synced");
      } else {
        // Server empty — seed it with whatever we have locally.
        setSyncStatus("synced");
        void pushRemote(stateRef.current);
      }
    } catch {
      remoteEnabled.current = false;
      setSyncStatus("local");
    }
  }, []);

  const pushRemote = useCallback(async (snapshot: AppState) => {
    if (!remoteEnabled.current) return;
    const payload = JSON.stringify(snapshot);
    if (payload === lastSaved.current) return;
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: authHeaders(),
        body: payload,
      });
      if (res.ok) {
        lastSaved.current = payload;
        setSyncStatus("synced");
      } else if (res.status === 401) {
        setSyncStatus("auth");
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus("error");
    }
  }, []);

  // Keep a ref to the latest state for async closures.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initial hydration: localStorage first (instant), then reconcile with server.
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem(KEY_STORAGE);
      if (savedKey) accessKey.current = savedKey;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInternal(mergeWithDefaults(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setHydrated(true);
    void loadRemote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change: localStorage immediately, server debounced.
  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    if (remoteEnabled.current) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => pushRemote(state), 1000);
    }
  }, [state, hydrated, pushRemote]);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setInternal((prev) => updater(prev));
  }, []);

  const patch = useCallback((partial: Partial<AppState>) => {
    setInternal((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setInternal(deepClone(initialState));
  }, []);

  const exportJSON = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importJSON = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as AppState;
      if (!parsed.positions || !parsed.skills) return false;
      setInternal(mergeWithDefaults(parsed));
      return true;
    } catch {
      return false;
    }
  }, []);

  const authenticate = useCallback(
    (key: string) => {
      accessKey.current = key;
      try {
        localStorage.setItem(KEY_STORAGE, key);
      } catch {
        /* ignore */
      }
      setSyncStatus("syncing");
      void loadRemote();
    },
    [loadRemote]
  );

  return (
    <StoreContext.Provider
      value={{
        state,
        setState,
        patch,
        reset,
        exportJSON,
        importJSON,
        hydrated,
        syncStatus,
        authenticate,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
