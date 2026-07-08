import { startTransition, useEffect, useState } from "react";

import type { AgentHarnessSummary } from "../types/agentHarness";
import type { SessionLoadSource } from "../types/session";

const DEFAULT_AGENT_HARNESS_PATH = "/data/agent-harness/latest.json";

function parseAgentHarnessSummary(candidate: unknown): AgentHarnessSummary {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Agent harness file is not a JSON object.");
  }

  const summary = candidate as Partial<AgentHarnessSummary>;
  if (summary.schema_version !== "agent_harness.web.v1") {
    throw new Error("Agent harness file has an unsupported schema_version.");
  }
  if (typeof summary.run_id !== "string") {
    throw new Error("Agent harness file is missing run_id.");
  }
  if (!Array.isArray(summary.harnesses)) {
    throw new Error("Agent harness file is missing harnesses.");
  }
  if (!Array.isArray(summary.results)) {
    throw new Error("Agent harness file is missing results.");
  }

  return summary as AgentHarnessSummary;
}

async function fetchSyncedAgentHarness(): Promise<AgentHarnessSummary> {
  const response = await fetch(DEFAULT_AGENT_HARNESS_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${DEFAULT_AGENT_HARNESS_PATH} (${response.status}).`);
  }

  const raw = (await response.json()) as unknown;
  return parseAgentHarnessSummary(raw);
}

export interface UseAgentHarnessDataResult {
  summary: AgentHarnessSummary | null;
  source: SessionLoadSource | null;
  isLoading: boolean;
  error: string | null;
  reloadSynced: () => Promise<void>;
}

export function useAgentHarnessData(): UseAgentHarnessDataResult {
  const [summary, setSummary] = useState<AgentHarnessSummary | null>(null);
  const [source, setSource] = useState<SessionLoadSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadSynced = async () => {
    setIsLoading(true);
    try {
      const parsed = await fetchSyncedAgentHarness();
      startTransition(() => {
        setSummary(parsed);
        setSource({
          kind: "synced",
          label: DEFAULT_AGENT_HARNESS_PATH,
        });
        setError(null);
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unknown agent harness loading error.";
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

  return {
    summary,
    source,
    isLoading,
    error,
    reloadSynced,
  };
}
