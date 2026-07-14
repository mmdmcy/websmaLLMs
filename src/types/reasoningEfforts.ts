import type {
  AgentHarnessContext,
  AgentHarnessFinding,
  AgentHarnessQualitySignals,
  AgentHarnessResourceUsage,
  AgentHarnessTask,
  AgentHarnessUsage,
} from "./agentHarness";

export interface ReasoningEffortVariant {
  variant_id: string;
  model: string;
  model_display_name?: string;
  reasoning_effort: string;
  rows?: number;
  completed?: number;
  passed?: number;
  failed?: number;
  pass_rate?: number | null;
  duration_seconds_total?: number;
  avg_duration_seconds?: number | null;
  reported_total_tokens?: number | null;
  reported_token_rows?: number;
  max_agent_rss_kb?: number | null;
  unexpected_change_rows?: number;
  run_id?: string;
  summary_path?: string;
  web_summary_path?: string;
  artifact_dir?: string;
}

export interface ReasoningEffortResult {
  variant_id: string;
  harness?: string;
  harness_display_name?: string;
  task: string;
  task_display_name?: string;
  status: string;
  test_status?: string;
  model: string;
  reasoning_effort: string;
  duration_seconds?: number;
  started_at?: string;
  ended_at?: string;
  changed_files?: string[];
  usage?: AgentHarnessUsage;
  context?: AgentHarnessContext;
  resource_usage?: { agent?: AgentHarnessResourceUsage };
  quality_signals?: AgentHarnessQualitySignals;
}

export interface ReasoningEffortSummary {
  schema_version: "reasoning_effort.web.v1";
  exported_at?: string;
  run_id: string;
  created_at?: string;
  status?: "complete" | "partial" | string;
  mode?: string;
  sweep_kind?: string;
  sampling_temperature?: number | null;
  temperature_note?: string;
  source?: Record<string, unknown>;
  model_catalog?: Array<{
    model: string;
    display_name?: string;
    description?: string;
    supported_reasoning_efforts?: string[];
  }>;
  selected_models?: string[];
  selected_reasoning_efforts?: string[];
  totals?: {
    variants?: number;
    rows?: number;
    completed?: number;
    passed?: number;
    failed?: number;
    dry_run?: number;
    duration_seconds_total?: number;
    reported_total_tokens?: number | null;
    reported_token_rows?: number;
    [key: string]: unknown;
  };
  variants: ReasoningEffortVariant[];
  findings?: AgentHarnessFinding[];
  tasks?: AgentHarnessTask[];
  results: ReasoningEffortResult[];
  limitations?: string[];
}
