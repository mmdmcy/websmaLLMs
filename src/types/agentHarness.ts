export interface AgentHarnessUsage {
  source: string;
  total_tokens?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  reasoning_tokens?: number | null;
  cached_input_tokens?: number | null;
  cost_usd?: number | null;
  raw?: string | null;
}

export interface AgentHarnessContext {
  source: string;
  context_window_tokens?: number | null;
  context_used_tokens?: number | null;
  remaining_context_tokens?: number | null;
}

export interface AgentHarnessResourceUsage {
  source?: string;
  metrics?: {
    max_resident_set_kb?: number;
    user_time_seconds?: number;
    system_time_seconds?: number;
    cpu_percent?: number;
    voluntary_context_switches?: number;
    involuntary_context_switches?: number;
    [key: string]: unknown;
  };
}

export interface AgentHarnessQualitySignals {
  expected_files?: string[];
  expected_files_modified?: string[];
  missing_expected_files?: string[];
  unexpected_changed_files?: string[];
  changed_file_count?: number;
  agent_exited_cleanly?: boolean;
  tests_passed?: boolean;
  agent_timed_out?: boolean;
  test_timed_out?: boolean;
}

export interface AgentHarnessResult {
  harness: string;
  harness_display_name?: string;
  task: string;
  task_display_name?: string;
  status: string;
  test_status?: string;
  model?: string;
  reasoning?: string;
  duration_seconds?: number;
  started_at?: string;
  ended_at?: string;
  agent_returncode?: number | null;
  agent_timed_out?: boolean;
  test_returncode?: number | null;
  changed_files?: string[];
  changed_file_count?: number;
  diff_stat?: string;
  usage?: AgentHarnessUsage;
  context?: AgentHarnessContext;
  resource_usage?: {
    agent?: AgentHarnessResourceUsage;
  };
  output_metrics?: Record<string, unknown>;
  quality_signals?: AgentHarnessQualitySignals;
  artifact_paths?: Record<string, string | null | undefined>;
}

export interface AgentHarnessAggregate {
  key: string;
  display_name?: string;
  version?: string | null;
  model?: string | null;
  reasoning?: string | null;
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
}

export interface AgentHarnessTask {
  key: string;
  display_name?: string;
  test_command?: string[];
  expected_files?: string[];
}

export interface AgentHarnessFinding {
  kind: string;
  title: string;
  summary: string;
}

export interface AgentHarnessSummary {
  schema_version: string;
  exported_at?: string;
  run_id: string;
  created_at?: string;
  mode?: string;
  timeout_seconds?: number;
  source?: Record<string, unknown>;
  system?: Record<string, unknown>;
  totals?: {
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
  harnesses: AgentHarnessAggregate[];
  findings?: AgentHarnessFinding[];
  tasks?: AgentHarnessTask[];
  results: AgentHarnessResult[];
  limitations?: string[];
}
