import { startTransition, useEffect, useState } from "react";

import type { BenchmarkSession, SessionLoadSource } from "../types/session";

const DEFAULT_SESSION_PATH = "/data/latest-session.json";

function parseSession(candidate: unknown): BenchmarkSession {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Session file is not a JSON object.");
  }

  const session = candidate as Partial<BenchmarkSession>;
  if (!session.schema_version) {
    throw new Error("Session file is missing schema_version.");
  }
  if (!session.run || typeof session.run !== "object" || typeof session.run.run_id !== "string") {
    throw new Error("Session file is missing run.run_id.");
  }
  if (!Array.isArray(session.evaluations)) {
    throw new Error("Session file is missing evaluations.");
  }
  if (!Array.isArray(session.leaderboard)) {
    throw new Error("Session file is missing leaderboard.");
  }
  if (!Array.isArray(session.models)) {
    throw new Error("Session file is missing models.");
  }
  if (!Array.isArray(session.benchmarks)) {
    throw new Error("Session file is missing benchmarks.");
  }

  return session as BenchmarkSession;
}

async function fetchSyncedSession(): Promise<BenchmarkSession> {
  const response = await fetch(DEFAULT_SESSION_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${DEFAULT_SESSION_PATH} (${response.status}).`);
  }

  const raw = (await response.json()) as unknown;
  return parseSession(raw);
}

export interface UseEvaluationDataResult {
  session: BenchmarkSession | null;
  source: SessionLoadSource | null;
  isLoading: boolean;
  error: string | null;
  importFile: (file: File) => Promise<void>;
  reloadSynced: () => Promise<void>;
}

export function useEvaluationData(): UseEvaluationDataResult {
  const [session, setSession] = useState<BenchmarkSession | null>(null);
  const [source, setSource] = useState<SessionLoadSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySession = (nextSession: BenchmarkSession, nextSource: SessionLoadSource) => {
    startTransition(() => {
      setSession(nextSession);
      setSource(nextSource);
      setError(null);
    });
  };

  const reloadSynced = async () => {
    setIsLoading(true);
    try {
      const parsed = await fetchSyncedSession();
      applySession(parsed, {
        kind: "synced",
        label: DEFAULT_SESSION_PATH,
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unknown session loading error.";
      startTransition(() => {
        setError(message);
        setSession(null);
        setSource(null);
      });
    } finally {
      setIsLoading(false);
    }
  };

  const importFile = async (file: File) => {
    setIsLoading(true);
    try {
      const rawText = await file.text();
      const parsed = parseSession(JSON.parse(rawText) as unknown);
      applySession(parsed, {
        kind: "imported",
        label: file.name,
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unknown import error.";
      startTransition(() => {
        setError(message);
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialSession = async () => {
      setIsLoading(true);
      try {
        const parsed = await fetchSyncedSession();
        applySession(parsed, {
          kind: "synced",
          label: DEFAULT_SESSION_PATH,
        });
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Unknown session loading error.";
        startTransition(() => {
          setError(message);
          setSession(null);
          setSource(null);
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadInitialSession();
  }, []);

  return {
    session,
    source,
    isLoading,
    error,
    importFile,
    reloadSynced,
  };
}
