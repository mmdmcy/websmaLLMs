export interface BenchmarkCatalogEntry {
  key: string;
  display_name?: string;
  description?: string;
  category?: string;
  status?: string;
  harness?: string;
  local_runnable?: boolean;
  dataset_name?: string | null;
  config_name?: string | null;
  split?: string | null;
  labs?: string[];
  notes?: string;
}

export interface BenchmarkMetricSummary {
  accuracy?: number;
  sample_count?: number;
  correct_count?: number;
  success_count?: number;
  success_rate?: number;
  responded_count?: number;
  response_rate?: number;
  error_count?: number;
  avg_latency_sec?: number;
  max_latency_sec?: number;
  min_latency_sec?: number;
  avg_load_duration_sec?: number;
  max_load_duration_sec?: number;
  min_load_duration_sec?: number;
  avg_prompt_eval_duration_sec?: number;
  max_prompt_eval_duration_sec?: number;
  min_prompt_eval_duration_sec?: number;
  avg_eval_duration_sec?: number;
  max_eval_duration_sec?: number;
  min_eval_duration_sec?: number;
  avg_total_duration_sec?: number;
  max_total_duration_sec?: number;
  min_total_duration_sec?: number;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  total_tokens?: number;
  avg_prompt_tokens?: number;
  max_prompt_tokens?: number;
  min_prompt_tokens?: number;
  avg_completion_tokens?: number;
  max_completion_tokens?: number;
  min_completion_tokens?: number;
  avg_total_tokens?: number;
  max_total_tokens?: number;
  min_total_tokens?: number;
  total_prompt_chars?: number;
  total_response_chars?: number;
  total_expected_answer_chars?: number;
  total_parsed_prediction_chars?: number;
  avg_prompt_chars?: number;
  avg_response_chars?: number;
  avg_expected_answer_chars?: number;
  avg_parsed_prediction_chars?: number;
  avg_tokens_per_second?: number;
  max_tokens_per_second?: number;
  min_tokens_per_second?: number;
  local_cost_estimate?: number;
  [key: string]: unknown;
}

export type LeaderboardBenchmarkCell = BenchmarkMetricSummary;

export interface LeaderboardRow {
  rank?: number;
  model_name: string;
  provider?: string;
  size_gb?: number;
  parameters?: string;
  architecture?: string;
  license?: string;
  max_context?: number;
  supports_vision?: boolean;
  model_type?: string;
  family?: string;
  quantization?: string;
  overall_accuracy?: number;
  success_rate?: number;
  response_rate?: number;
  benchmarks_run?: number;
  total_samples?: number;
  correct_count?: number;
  success_count?: number;
  responded_count?: number;
  error_count?: number;
  avg_latency_sec?: number;
  avg_load_duration_sec?: number;
  avg_prompt_eval_duration_sec?: number;
  avg_eval_duration_sec?: number;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  total_tokens?: number;
  avg_tokens_per_second?: number;
  total_prompt_chars?: number;
  total_response_chars?: number;
  total_expected_answer_chars?: number;
  total_parsed_prediction_chars?: number;
  benchmarks?: Record<string, LeaderboardBenchmarkCell>;
}

export interface EvaluationModelInfo {
  name: string;
  provider?: string;
  size_gb?: number;
  parameters?: string;
  architecture?: string;
  license?: string;
  max_context?: number;
  supports_vision?: boolean;
  model_type?: string;
  family?: string;
  quantization?: string;
  [key: string]: unknown;
}

export interface EvaluationSample {
  sample_id?: string;
  evaluation_id?: string;
  run_id?: string;
  benchmark_name?: string;
  sample_index?: number;
  model_name?: string;
  provider?: string;
  prompt?: string;
  response_text?: string;
  expected_answer?: string;
  parsed_prediction?: string;
  is_correct?: boolean;
  error?: string | null;
  started_at?: string;
  ended_at?: string;
  latency_sec?: number;
  load_duration_sec?: number;
  prompt_eval_duration_sec?: number;
  eval_duration_sec?: number;
  total_duration_sec?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  tokens_per_second?: number;
  prompt_chars?: number;
  response_chars?: number;
  expected_answer_chars?: number;
  parsed_prediction_chars?: number;
  raw_provider_metrics?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface EvaluationBrief {
  evaluation_id?: string;
  benchmark_name?: string;
  benchmark_display_name?: string;
  description?: string;
  dataset?: Record<string, unknown>;
  model?: EvaluationModelInfo;
  metrics?: BenchmarkMetricSummary;
  status?: string;
  error?: string;
  artifact_paths?: Record<string, string>;
  sample_count_embedded?: number;
}

export interface EvaluationRecord extends EvaluationBrief {
  evaluation_id: string;
  benchmark_name: string;
  model: EvaluationModelInfo;
  samples: EvaluationSample[];
}

export interface ModelBundle {
  model_name: string;
  slug?: string;
  leaderboard: LeaderboardRow;
  evaluation_ids?: Array<string | undefined>;
  evaluations?: EvaluationBrief[];
}

export interface BenchmarkBundle {
  benchmark_name: string;
  display_name?: string;
  description?: string;
  dataset?: Record<string, unknown>;
  results: EvaluationBrief[];
}

export interface SessionSummary {
  run_id?: string;
  generated_at?: string;
  manifest_path?: string;
  totals?: Record<string, number>;
}

export interface SessionSourceInfo {
  artifacts_dir?: string;
  output_dir?: string;
  sync_dir?: string | null;
}

export interface SessionRunInfo {
  run_id: string;
  run_dir?: string;
  manifest: Record<string, unknown>;
}

export interface BenchmarkSession {
  schema_version: string;
  exported_at?: string;
  source?: SessionSourceInfo;
  run: SessionRunInfo;
  summary: SessionSummary;
  catalog?: {
    selected_benchmarks?: BenchmarkCatalogEntry[];
    benchmark_suites?: Array<Record<string, unknown>>;
  };
  leaderboard: LeaderboardRow[];
  models: ModelBundle[];
  benchmarks: BenchmarkBundle[];
  evaluations: EvaluationRecord[];
}

export interface SessionLoadSource {
  kind: "synced" | "imported";
  label: string;
}
