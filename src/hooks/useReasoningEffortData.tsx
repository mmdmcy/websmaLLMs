import { startTransition, useEffect, useState } from "react";

import type { SessionLoadSource } from "../types/session";
import type { ReasoningEffortSummary } from "../types/reasoningEfforts";

const DEFAULT_REASONING_EFFORT_PATH = "/data/reasoning-efforts/latest.json";

function parseReasoningEffortSummary(candidate: unknown): ReasoningEffortSummary {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Reasoning-effort file is not a JSON object.");
  }

  const summary = candidate as Partial<ReasoningEffortSummary>;
  if (summary.schema_version !== "reasoning_effort.web.v1") {
    throw new Error("Reasoning-effort file has an unsupported schema_version.");
  }
  if (typeof summary.run_id !== "string") {
    throw new Error("Reasoning-effort file is missing run_id.");
  }
  if (!Array.isArray(summary.variants)) {
    throw new Error("Reasoning-effort file is missing variants.");
  }
  if (!Array.isArray(summary.results)) {
    throw new Error("Reasoning-effort file is missing results.");
  }

  return summary as ReasoningEffortSummary;
}

async function fetchSyncedReasoningEffortSummary(): Promise<ReasoningEffortSummary> {
  const response = await fetch(DEFAULT_REASONING_EFFORT_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${DEFAULT_REASONING_EFFORT_PATH} (${response.status}).`);
  }

  return parseReasoningEffortSummary(await response.json());
}

export interface UseReasoningEffortDataResult {
  summary: ReasoningEffortSummary | null;
  source: SessionLoadSource | null;
  isLoading: boolean;
  error: string | null;
  reloadSynced: () => Promise<void>;
}

export function useReasoningEffortData(): UseReasoningEffortDataResult {
  const [summary, setSummary] = useState<ReasoningEffortSummary | null>(null);
  const [source, setSource] = useState<SessionLoadSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadSynced = async () => {
    setIsLoading(true);
    try {
      const parsed = await fetchSyncedReasoningEffortSummary();
      startTransition(() => {
        setSummary(parsed);
        setSource({ kind: "synced", label: DEFAULT_REASONING_EFFORT_PATH });
        setError(null);
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unknown reasoning-effort loading error.";
      startTransition(() => {
        setError(message);
        setSummary(null);
        setSource(null);
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reloadSynced();
  }, []);

  return { summary, source, isLoading, error, reloadSynced };
}
